import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository, SelectQueryBuilder } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DoctorShift } from '../entities/shift.entity';
import { AppointmentDisruptionItem } from '../entities/appointment-disruption-item.entity';
import { DoctorShiftChangeLog } from '../entities/doctor-shift-change-log.entity';
import { ShiftDisruption } from '../entities/shift-disruption.entity';
import { ShiftSlot } from '../../../database/entities/shift-slot.entity';
import { SearchDoctorShiftDto } from '../dto/requests/search-doctor-shift.dto';
import { ShiftAssigneeDetails, ShiftWithDetails, IShiftsRepository } from '../interfaces/shifts-repository.interface';
import { BatchShiftConflictInput, ShiftConflictInput } from '../interfaces/shifts-conflict-input.interface';
import { ShiftConflicts } from '../interfaces/shift-conflicts.interface';
import { DoctorAppointmentBlock } from '../interfaces/doctor-appointment-block.interface';
import {
  AppointmentDisruptionResolutionStatus,
  AppointmentStatus,
  DoctorShiftStatus,
  ShiftDisruptionStatus,
} from '../../../common/constants/status.enum';
import { addDays, isOvernightRange, shiftIntervalsOverlap } from '../helpers/shifts.helper';
import { PRIMARY_ROOM_ROLE_NAMES, roleOccupiesPrimaryRoom } from '../helpers/shift-role-policy.helper';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { UpdateShiftWithAuditInput, UpdateShiftWithAuditResult } from '../interfaces/shift-update.interface';

@Injectable()
export class ShiftsRepository implements IShiftsRepository {
  // Repository này là lớp truy cập dữ liệu của module shifts.
  // Controller/Service không nên viết SQL trực tiếp; mọi thao tác DB về ca trực đi qua class này.
  constructor(
    // InjectRepository: là một decorator của NestJS, 
    // được sử dụng để tiêm (inject) một repository của TypeORM vào trong một class.
    // Repository: là một lớp của TypeORM, cung cấp các phương thức để tương tác với cơ sở dữ liệu.
    // DoctorShift: là một entity, đại diện cho bảng doctor_shifts trong cơ sở dữ liệu.
    // Vì vậy, @InjectRepository(DoctorShift) sẽ tiêm một repository của 
    // entity DoctorShift vào trong class ShiftsRepository.
    //trong doctorShift có các thuộc tính như id, doctorId, facilityId, roomId, shiftDate, startTime, endTime, maxAppointments, status, createdAt và updatedAt.
    //quan trọng có @Entity('doctor_shifts') để xác định bảng trong cơ sở dữ liệu mà entity này đại diện.

    @InjectRepository(DoctorShift)
    
    private readonly repository: Repository<DoctorShift>,
    @InjectRepository(ShiftSlot)
    private readonly shiftSlotRepository?: Repository<ShiftSlot>,
  ) {}

  create(data: DeepPartial<DoctorShift>): DoctorShift {
    return this.repository.create(data);
  }

  // Lưu một ca trực xuống DB. TypeORM sẽ tự insert hoặc update tùy entity có id hay chưa.
  save(shift: DoctorShift): Promise<DoctorShift> {
    return this.repository.save(shift);
  }

  /**
   * Lưu ca, đồng bộ các lịch hẹn bị ảnh hưởng và ghi audit log trong cùng transaction.
   * Nếu một bước thất bại, toàn bộ thay đổi được rollback để dữ liệu không lệch nhau.
   */
  async updateWithAudit(input: UpdateShiftWithAuditInput): Promise<UpdateShiftWithAuditResult> {
    const { before, after, changes, affectedAppointments, reason, changedBy } = input;

    return this.repository.manager.transaction(async manager => {
      const updatedShift = await manager.save(DoctorShift, after);
      const appointmentIds = affectedAppointments.map(appointment => appointment.id);

      if (appointmentIds.length > 0 && (changes.assigneeChanged || changes.roomChanged)) {
        const appointmentPatch: { doctorId?: string; roomId?: string } = {};
        if (changes.assigneeChanged) appointmentPatch.doctorId = after.staffId;
        if (changes.roomChanged && after.roomId) appointmentPatch.roomId = after.roomId;
        await manager.update(Appointment, { id: In(appointmentIds) }, appointmentPatch);
      }

      const logResult = await manager.createQueryBuilder().insert().into(DoctorShiftChangeLog).values({
        shiftId: before.id,
        action: this.resolveUpdateAction(changes),
        oldStatus: before.status,
        newStatus: after.status,
        oldStaffId: before.staffId,
        newStaffId: after.staffId,
        oldRoomId: before.roomId,
        newRoomId: after.roomId,
        oldStartTime: before.startTime,
        newStartTime: after.startTime,
        oldEndTime: before.endTime,
        newEndTime: after.endTime,
        reason: reason ?? null,
        changedBy: changedBy ?? null,
      }).execute();

      return {
        shift: updatedShift,
        changeLogId: String(logResult.identifiers[0]?.id),
      };
    });
  }

  // Lưu nhiều ca trực cùng lúc, dùng cho bulk-create và copy-week.
  async saveMany(shifts: DeepPartial<DoctorShift>[]): Promise<DoctorShift[]> {
    if (shifts.length === 0) return [];
    const entities = this.repository.create(shifts);
    await this.repository.createQueryBuilder()
      .insert()
      .values(entities as unknown as QueryDeepPartialEntity<DoctorShift>[])
      .execute();
    return entities;
  }

  // Hard delete khỏi DB; service chỉ nên gọi khi đã chắc chắn ca chưa có appointment liên quan.
  async remove(shift: DoctorShift): Promise<void> {
    await this.repository.manager.transaction(async manager => {
      await manager
        .createQueryBuilder()
        .delete()
        .from(AppointmentDisruptionItem)
        .where(`
          disruption_id IN (
            SELECT disruption.id
            FROM shift_disruptions disruption
            WHERE disruption.shift_id = :shiftId
              OR disruption.doctor_shift_id = :shiftId
              OR (disruption.source_type = :sourceType AND disruption.source_id = :shiftId)
          )
        `)
        .setParameters({ shiftId: shift.id, sourceType: 'shift' })
        .execute();

      await manager.delete(ShiftDisruption, [
        { shiftId: shift.id },
        { doctorShiftId: shift.id },
        { sourceType: 'shift', sourceId: shift.id },
      ]);
      await manager
        .createQueryBuilder()
        .delete()
        .from('shift_change_logs')
        .where('shift_id = :shiftId', { shiftId: shift.id })
        .execute();
      await manager.delete(DoctorShift, { id: shift.id });
    });
  }

  // Tìm ca theo id và loại các ca đã soft-delete/cancel bằng deletedAt.
  findById(id: string): Promise<DoctorShift | null> {
    return this.repository
      .createQueryBuilder('shift')
      .where('shift.id = :id', { id })
      .andWhere('shift.deletedAt IS NULL')
      .getOne();
  }

  // Dung rieng cho DELETE de xu ly duoc cac ca cancelled cu da lo bi gan deletedAt.
  findByIdForRemoval(id: string): Promise<DoctorShift | null> {
    return this.repository
      .createQueryBuilder('shift')
      .withDeleted()
      .where('shift.id = :id', { id })
      .getOne();
  }

  async findDetailsById(id: string): Promise<ShiftWithDetails | null> {
    return (await this.buildDetailsQuery()
      .where('shift.id = :id', { id })
      .andWhere('shift.deletedAt IS NULL')
      .getRawOne<ShiftWithDetails>()) ?? null;
  }

  findAll(filters?: SearchDoctorShiftDto): Promise<ShiftWithDetails[]> {
    return this.buildListQuery(filters).getRawMany<ShiftWithDetails>();
  }

  // Dùng chung buildListQuery với findAll để tránh lệch logic filter giữa list thường và list phân trang.
  findAllPaginated(filters?: SearchDoctorShiftDto) {
    return this.paginateRaw<ShiftWithDetails>(this.buildListQuery(filters), {
      page: filters?.page,
      limit: filters?.limit,
    });
  }


  async findConflicts(input: ShiftConflictInput): Promise<ShiftConflicts> {
    // Hàm này tìm các ca đang bị trùng với ca sắp tạo/cập nhật.
    // Công thức overlap chuẩn:
    // existing.startTime < input.endTime && existing.endTime > input.startTime.
    // Chỉ cần 2 khoảng giờ giao nhau một phần là xem như conflict.
    //b1: baseQuery: tạo một truy vấn cơ sở dữ liệu để 
    // tìm kiếm các ca làm việc của bác sĩ dựa trên các điều kiện được cung cấp trong input.

    const staffId = input.staffId ?? input.doctorId;
    const fromDate = addDays(input.shiftDate, -1);
    const toDate = addDays(input.shiftDate, 1);
    const baseQuery = (statuses: string[]) => {
      // baseQuery chứa điều kiện chung cho cả conflict theo bác sĩ và conflict theo phòng.
      // statuses giúp tùy biến trạng thái nào được tính là conflict trong từng loại query.
      const query = this.repository
      // createQueryBuilder: tạo một truy vấn cơ sở dữ liệu để 
      // tìm kiếm các ca làm việc của bác sĩ
      // dựa trên các điều kiện được cung cấp trong input.
      //doctor_shifts: là tên của bảng trong cơ sở dữ liệu mà truy vấn sẽ được thực hiện.
        .createQueryBuilder('doctor_shifts')
        // Alias 'doctor_shifts' là tên tạm trong query builder.
        // Nó không phải biến entity; đặt giống tên bảng để đọc SQL dễ hơn.
        .where('doctor_shifts.shiftDate BETWEEN :fromDate AND :toDate', { fromDate, toDate })
        .andWhere('doctor_shifts.deletedAt IS NULL')
        // Hai dòng dưới là điều kiện kiểm tra giao nhau giữa 2 khoảng giờ.
        // IN (:...statuses): là một điều kiện trong truy vấn SQL,
        // được sử dụng để kiểm tra xem giá trị của một cột có nằm trong một tập hợp các giá trị hay không.
        .andWhere('doctor_shifts.status IN (:...statuses)', { statuses });
      if (input.excludeShiftId) {
        // Khi update, bỏ qua chính ca đang sửa để nó không tự conflict với nó.
        query.andWhere('doctor_shifts.id != :excludeShiftId', { excludeShiftId: input.excludeShiftId });
      }
      return query;
    };

    // Conflict theo bác sĩ: bác sĩ không được có 2 ca giao nhau.
    // Trạng thái off cũng tính là conflict vì off nghĩa là bác sĩ không làm việc trong khoảng đó.
    const doctorQuery = baseQuery(['available', 'full', 'off']).andWhere('doctor_shifts.staffId = :staffId', {
      staffId,
    });
    // Conflict theo phòng: chỉ kiểm tra nếu ca có roomId.
    // OFF không dùng phòng nên roomQuery chỉ xét available/full.
    const roomQuery = input.roomId && roleOccupiesPrimaryRoom(input.roleName)
      ? baseQuery(['available', 'full'])
        .leftJoin('roles', 'shiftRole', 'shiftRole.id = doctor_shifts.roleId')
        .andWhere('doctor_shifts.roomId = :roomId', { roomId: input.roomId })
        .andWhere(
          '(shiftRole.name IN (:...primaryRoomRoleNames) OR doctor_shifts.roleId IS NULL)',
          { primaryRoomRoleNames: PRIMARY_ROOM_ROLE_NAMES },
        )
      : null;
      // Promise.all: dùng để thực hiện nhiều promise song song và chờ tất cả chúng hoàn thành.
      // Trong trường hợp này, nó được sử dụng để thực hiện hai truy vấn cơ sở dữ liệu song song: 
      // doctorQuery và roomQuery.
    const [doctorConflicts, roomConflicts] = await Promise.all([
      doctorQuery.getMany(),
      roomQuery ? roomQuery.getMany() : Promise.resolve([]),
    ]);
    return {
      doctorConflicts: this.filterOverlappingShifts(input, doctorConflicts),
      roomConflicts: this.filterOverlappingShifts(input, roomConflicts),
    };
  }

  /** Doc cac ca co kha nang xung dot mot lan, sau do doi chieu tung candidate trong bo nho. */
  async findConflictsForBatch(inputs: BatchShiftConflictInput[]): Promise<Map<number, ShiftConflicts>> {
    const result = new Map<number, ShiftConflicts>();
    if (inputs.length === 0) return result;

    const facilityIds = [...new Set(inputs.map(input => input.facilityId))];
    const dates = inputs.map(input => input.shiftDate).sort();
    const existingShifts = await this.repository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.role', 'role')
      .where('shift.facilityId IN (:...facilityIds)', { facilityIds })
      .andWhere('shift.shiftDate BETWEEN :fromDate AND :toDate', {
        fromDate: addDays(dates[0], -1),
        toDate: addDays(dates[dates.length - 1], 1),
      })
      .andWhere('shift.deletedAt IS NULL')
      .andWhere('shift.status IN (:...statuses)', {
        statuses: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.FULL, DoctorShiftStatus.OFF],
      })
      .getMany();

    for (const input of inputs) {
      const overlapping = existingShifts.filter(shift =>
        shift.facilityId === input.facilityId
        && shift.id !== input.excludeShiftId
        && shiftIntervalsOverlap(
          input.shiftDate,
          input.startTime,
          input.endTime,
          this.toDateOnly(shift.shiftDate),
          shift.startTime,
          shift.endTime,
        ),
      );
      const doctorConflicts = overlapping.filter(shift =>
        shift.staffId === (input.staffId ?? input.doctorId),
      );
      const roomConflicts = input.roomId && roleOccupiesPrimaryRoom(input.roleName)
        ? overlapping.filter(shift =>
          shift.roomId === input.roomId
          && shift.status !== DoctorShiftStatus.OFF
          && (shift.roleId === null || roleOccupiesPrimaryRoom(shift.role?.name)),
        )
        : [];
      result.set(input.index, { doctorConflicts, roomConflicts });
    }

    return result;
  }

  findWeekly(
    facilityId: string,
    startDate: string,
    endDate: string,
    doctorId?: string,
  ): Promise<DoctorShift[]> {
    // Lấy lịch trực trong một khoảng ngày, hiện dùng cho weekly calendar và copy-week.
    // Nếu truyền doctorId thì chỉ lấy lịch của bác sĩ đó trong facility.
    const query = this.repository
      .createQueryBuilder('shift')
      .where('shift.facilityId = :facilityId', { facilityId })
      .andWhere('shift.deletedAt IS NULL')
      .andWhere('shift.shiftDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.startTime', 'ASC');
    if (doctorId) {
      query.andWhere('shift.staffId IN (SELECT doctor.staff_id FROM doctors doctor WHERE doctor.id = :doctorId)', { doctorId });
    }
    return query.getMany();
  }

  findWeeklyWithDetails(
    facilityId: string,
    startDate: string,
    endDate: string,
    doctorId?: string,
  ): Promise<ShiftWithDetails[]> {
    const query = this.buildDetailsQuery()
      .where('shift.facilityId = :facilityId', { facilityId })
      .andWhere('shift.deletedAt IS NULL')
      .andWhere('shift.shiftDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.startTime', 'ASC');

    if (doctorId) query.andWhere('doctor.id = :doctorId', { doctorId });
    return query.getRawMany<ShiftWithDetails>();
  }

  async findDoctorShiftsForDate(
    facilityId: string,
    doctorId: string,
    date: string,
  ): Promise<DoctorShift[]> {
    // Lấy các ca có thể nhận lịch hẹn của một bác sĩ trong một ngày.
    // Chỉ lấy available/full vì cancelled/off không dùng để sinh slot đặt lịch.
    const previousDate = addDays(date, -1);
    const shifts = await this.repository
      .createQueryBuilder('shift')
      .where('shift.facilityId = :facilityId', { facilityId })
      .andWhere('shift.deletedAt IS NULL')
      .andWhere('shift.staffId IN (SELECT doctor.staff_id FROM doctors doctor WHERE doctor.id = :doctorId)', { doctorId })
      .andWhere('shift.shiftDate BETWEEN :previousDate AND :date', { previousDate, date })
      .andWhere('shift.status IN (:...statuses)', {
        statuses: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.FULL],
      })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.startTime', 'ASC')
      .getMany();

    return shifts.filter(shift =>
      this.toDateOnly(shift.shiftDate) === date
      || (this.toDateOnly(shift.shiftDate) === previousDate && isOvernightRange(shift.startTime, shift.endTime)),
    );
  }

  findDoctorAppointmentsForDate(
    facilityId: string,
    doctorId: string,
    date: string,
  ): Promise<DoctorAppointmentBlock[]> {
    // Những trạng thái này vẫn đang giữ chỗ trên lịch, nên phải chặn slot availability.
    // completed/cancelled/no_show/rescheduled không còn giữ slot hiện tại.
    const activeStatuses = [
      AppointmentStatus.PENDING_PAYMENT,
      AppointmentStatus.BOOKED,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CHECKED_IN,
      AppointmentStatus.IN_PROGRESS,
    ];
    const nextDate = addDays(date, 1);

    return this.repository.manager
      .createQueryBuilder()
      // Dùng raw query vì Appointment entity nằm ngoài module shifts,
      // và ở đây chỉ cần vài field nhỏ để tính slot, không cần load full entity.
      .select('appointment.id', 'id')
      .addSelect('appointment.scheduled_start', 'scheduledStart')
      .addSelect('appointment.scheduled_end', 'scheduledEnd')
      .addSelect('appointment.status', 'status')
      .from('appointments', 'appointment')
      .innerJoin('doctors', 'doctor', 'doctor.staff_id = appointment.doctor_id')
      .innerJoin('staffs', 'staff', 'staff.id = doctor.staff_id')
      .where('staff.facility_id = :facilityId', { facilityId })
      .andWhere('doctor.id = :doctorId', { doctorId })
      // DATE(...) giúp so sánh phần ngày của scheduled_start với date dạng YYYY-MM-DD.
      .andWhere('DATE(appointment.scheduled_start) BETWEEN :date AND :nextDate', { date, nextDate })
      .andWhere('appointment.status IN (:...activeStatuses)', { activeStatuses })
      .orderBy('appointment.scheduled_start', 'ASC')
      .getRawMany<DoctorAppointmentBlock>();
  }

  async findAppointmentsForShift(shift: DoctorShift, activeOnly = false): Promise<DoctorAppointmentBlock[]> {
    // Tìm appointment nằm trong khoảng giờ của một ca trực cụ thể.
    // Dùng khi xóa/hủy ca để biết appointment nào bị ảnh hưởng.
    const shiftDate = this.toDateOnly(shift.shiftDate);
    const nextDate = addDays(shiftDate, 1);
    const query = this.repository.manager
      .createQueryBuilder()
      .select('appointment.id', 'id')
      .addSelect('appointment.doctor_id', 'doctorId')
      .addSelect('appointment.room_id', 'roomId')
      .addSelect('appointment.scheduled_start', 'scheduledStart')
      .addSelect('appointment.scheduled_end', 'scheduledEnd')
      .addSelect('appointment.status', 'status')
      .from('appointments', 'appointment')
      .innerJoin('staffs', 'staff', 'staff.id = appointment.doctor_id')
      .where('staff.facility_id = :facilityId', { facilityId: shift.facilityId })
      .andWhere('appointment.doctor_id = :staffId', { staffId: shift.staffId })
      .andWhere('DATE(appointment.scheduled_start) BETWEEN :shiftDate AND :nextDate', { shiftDate, nextDate })
      // Hai dòng TIME(...) dưới kiểm tra appointment có giao với giờ của ca không.
      ;

    if (activeOnly) {
      // activeOnly = true nghĩa là chỉ lấy các appointment còn cần xử lý khi ca bị hủy.
      query.andWhere('appointment.status IN (:...statuses)', {
        statuses: [
          AppointmentStatus.PENDING_PAYMENT,
          AppointmentStatus.BOOKED,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.RESCHEDULED,
          AppointmentStatus.CHECKED_IN,
          AppointmentStatus.IN_PROGRESS,
        ],
      });
    }

    const appointments = await query.orderBy('appointment.scheduled_start', 'ASC').getRawMany<DoctorAppointmentBlock>();
    return appointments.filter(appointment =>
      shiftIntervalsOverlap(
        shiftDate,
        shift.startTime,
        shift.endTime,
        this.toDateOnly(appointment.scheduledStart),
        this.dateTimeToTime(appointment.scheduledStart),
        this.dateTimeToTime(appointment.scheduledEnd),
      ),
    );
  }

  async cancelShiftWithDisruption(
    shift: DoctorShift,
    affectedAppointments: DoctorAppointmentBlock[],
    reason?: string,
    changedBy?: string | null,
  ): Promise<{ shift: DoctorShift; disruptionId?: string }> {
    // Transaction đảm bảo các thao tác hủy ca đi cùng nhau:
    // 1. update doctor_shift thành cancelled
    // 2. ghi doctor_shift_change_logs
    // 3. tạo shift_disruptions nếu có appointment bị ảnh hưởng
    // 4. tạo appointment_disruption_items cho từng appointment
    // Nếu một bước lỗi, toàn bộ transaction rollback để tránh dữ liệu nửa vời.
    return this.repository.manager.transaction(async manager => {
      // Soft-cancel ca trực: không hard delete vì đã có lịch sử/appointment liên quan.
      await manager.update(DoctorShift, shift.id, {
        status: DoctorShiftStatus.CANCELLED,
        note: reason ?? shift.note ?? null,
      });

      //log 2
      // Ghi audit log để sau này biết ai hủy, hủy từ trạng thái nào sang trạng thái nào, lý do gì.
      await manager.createQueryBuilder().insert().into(DoctorShiftChangeLog).values({
        shiftId: shift.id,
        action: 'cancelled',
        oldStatus: shift.status,
        newStatus: DoctorShiftStatus.CANCELLED,
        oldStaffId: shift.staffId,
        newStaffId: shift.staffId,
        oldRoomId: shift.roomId,
        newRoomId: shift.roomId,
        oldStartTime: shift.startTime,
        newStartTime: shift.startTime,
        oldEndTime: shift.endTime,
        newEndTime: shift.endTime,
        reason: reason ?? null,
        changedBy: changedBy ?? null,
      }).execute();

      let disruptionId: string | undefined;
      if (affectedAppointments.length > 0) {
        // shift_disruptions là "hồ sơ sự cố" chung cho lần hủy ca này.
        // Một disruption có thể ảnh hưởng nhiều appointment.
        const disruptionResult = await manager.createQueryBuilder().insert().into(ShiftDisruption).values({
          type: 'doctor_shift_cancelled',
          sourceType: 'shift',
          sourceId: shift.id,
          facilityId: shift.facilityId,
          shiftId: shift.id,
          staffId: shift.staffId,
          doctorShiftId: shift.id,
          roomId: shift.roomId ?? null,
          reason: reason ?? null,
          status: ShiftDisruptionStatus.OPEN,
          createdBy: changedBy ?? null,
        }).execute();

        // TypeORM trả id record vừa insert trong identifiers.
        // Ép sang string để đồng nhất với kiểu id bigint đang dùng trong entity.
        disruptionId = String(disruptionResult.identifiers[0]?.id);

        // Mỗi appointment bị ảnh hưởng được ghi thành một item riêng.
        // Sau này các API reschedule/reassign/cancel sẽ xử lý từng item này.
        await manager.createQueryBuilder().insert().into(AppointmentDisruptionItem).values(
          affectedAppointments.map(appointment => ({
            disruptionId,
            appointmentId: appointment.id,
            oldStaffId: shift.staffId,
            oldDoctorId: shift.staffId,
            oldRoomId: shift.roomId ?? null,
            oldScheduledStart: appointment.scheduledStart as Date,
            oldScheduledEnd: appointment.scheduledEnd as Date,
            resolutionStatus: AppointmentDisruptionResolutionStatus.PENDING,
          })),
        ).execute();
      }

      // Đọc lại ca sau khi update để trả về trạng thái mới nhất cho service/controller.
      const updatedShift = await manager.findOneByOrFail(DoctorShift, { id: shift.id });
      return { shift: updatedShift, disruptionId };
    });
  }

  async hasUnresolvedDisruptions(shiftId: string): Promise<boolean> {
    const row = await this.repository.manager.createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(AppointmentDisruptionItem, 'item')
      .innerJoin(ShiftDisruption, 'disruption', 'disruption.id = item.disruption_id')
      .where('(disruption.shift_id = :shiftId OR disruption.doctor_shift_id = :shiftId)', { shiftId })
      .andWhere('item.resolution_status IN (:...statuses)', {
        statuses: [
          AppointmentDisruptionResolutionStatus.PENDING,
          AppointmentDisruptionResolutionStatus.REFUND_PENDING,
        ],
      })
      .getRawOne<{ count: string }>();
    return Number(row?.count ?? 0) > 0;
  }

  // return true nếu bác sĩ được chỉ định cho cơ sở y tế, ngược lại return false.
  async isDoctorAssignedToFacility(doctorId: string, facilityId: string): Promise<boolean> {
    // Bác sĩ không nối trực tiếp với facility.
    // Luồng hiện tại là: doctors.staff_id -> facility_staff.staff_id -> facility_staff.facility_id.
    // Vì vậy cần join doctors với facility_staff để kiểm tra bác sĩ có thuộc cơ sở này không.
    // this.repository.manager: là một đối tượng quản lý kết nối cơ sở dữ liệu trong TypeORM,
    // được sử dụng để thực hiện các thao tác cơ sở dữ liệu như truy vấn, lưu trữ, xóa, v.v.
    // Schema hien tai dang gan co so truc tiep tren staffs.facility_id.
    // Do do query di theo doctors.staff_id -> staffs.id, khong join bang facility_staff.
    const row = await this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('doctors', 'doctor')
      // staff.staff_id = doctor.staff_id nghĩa là lấy assignment cơ sở của staff đứng sau bác sĩ đó.
      .innerJoin('staffs', 'staff', 'staff.id = doctor.staff_id')
      .where('doctor.id = :doctorId', { doctorId })
      .andWhere('doctor.status = :active', { active: 'active' })
      .andWhere('staff.facility_id = :facilityId', { facilityId })
      .andWhere('staff.status = :active', { active: 'active' })
      .getRawOne<{ count: string }>(); 
      //set sang số nguyên
      // phát hiện trả 1 không có thì trả 0
    // COUNT(*) trả string trong MySQL/MariaDB, nên cần Number(...) trước khi so sánh.
    return Number(row?.count ?? 0) > 0;
  }

  async findDoctorStaffId(doctorId: string, facilityId?: string): Promise<string | null> {
    const query = this.repository.manager
      .createQueryBuilder()
      .select('doctor.staff_id', 'staffId')
      .from('doctors', 'doctor')
      .innerJoin('staffs', 'staff', 'staff.id = doctor.staff_id')
      .where('doctor.id = :doctorId', { doctorId })
      .andWhere('doctor.status = :active', { active: 'active' })
      .andWhere('staff.status = :active', { active: 'active' });

    if (facilityId) {
      query.andWhere('staff.facility_id = :facilityId', { facilityId });
    }

    const row = await query.getRawOne<{ staffId: string }>();
    return row?.staffId ?? null;
  }

  async findDoctorIdByStaffId(staffId: string, facilityId?: string): Promise<string | null> {
    const query = this.repository.manager
      .createQueryBuilder()
      .select('doctor.id', 'doctorId')
      .from('doctors', 'doctor')
      .innerJoin('staffs', 'staff', 'staff.id = doctor.staff_id')
      .where('doctor.staff_id = :staffId', { staffId })
      .andWhere('doctor.status = :active', { active: 'active' })
      .andWhere('staff.status = :active', { active: 'active' });

    if (facilityId) {
      query.andWhere('staff.facility_id = :facilityId', { facilityId });
    }

    const row = await query.getRawOne<{ doctorId: string }>();
    return row?.doctorId ?? null;
  }

  async findShiftAssignee(
    staffId: string,
    facilityId: string,
    roleId?: string | null,
  ): Promise<ShiftAssigneeDetails | null> {
    const query = this.repository.manager
      .createQueryBuilder()
      .select('staff.id', 'staffId')
      .addSelect('staff.name', 'staffName')
      .addSelect('staff.facility_id', 'facilityId')
      .addSelect('role.id', 'roleId')
      .addSelect('role.name', 'roleName')
      .addSelect('doctor.id', 'doctorId')
      .from('staffs', 'staff')
      .innerJoin('staff_roles', 'staffRole', 'staffRole.staff_id = staff.id')
      .innerJoin('roles', 'role', 'role.id = staffRole.role_id AND role.deleted_at IS NULL')
      .leftJoin('doctors', 'doctor', 'doctor.staff_id = staff.id AND doctor.status = :active', { active: 'active' })
      .where('staff.id = :staffId', { staffId })
      .andWhere('staff.facility_id = :facilityId', { facilityId })
      .andWhere('staff.status = :active', { active: 'active' });

    if (roleId) {
      query.andWhere('role.id = :roleId', { roleId });
    }

    const row = await query.getRawOne<Record<string, unknown>>();
    if (!row) return null;

    return {
      staffId: String(row.staffId),
      staffName: String(row.staffName),
      facilityId: String(row.facilityId),
      roleId: row.roleId ? String(row.roleId) : null,
      roleName: row.roleName ? String(row.roleName) : null,
      doctorId: row.doctorId ? String(row.doctorId) : null,
    };
  }

  findShiftSlotById(slotId: string): Promise<ShiftSlot | null> {
    if (!this.shiftSlotRepository) {
      return Promise.resolve(null);
    }
    return this.shiftSlotRepository
      .createQueryBuilder('slot')
      .where('slot.id = :slotId', { slotId })
      .andWhere('slot.deletedAt IS NULL')
      .getOne();
  }

  private buildListQuery(filters?: SearchDoctorShiftDto): SelectQueryBuilder<DoctorShift> {
    // Query nền cho API list/search ca trực.
    // Tất cả list mặc định bỏ qua deletedAt để không hiện ca đã soft-delete/cancel.
    const query = this.buildDetailsQuery()
      .where('shift.deletedAt IS NULL')
      .orderBy('shift.shiftDate', 'DESC')
      .addOrderBy('shift.startTime', 'ASC');
    if (filters?.doctorId) query.andWhere('doctor.id = :doctorId', { doctorId: filters.doctorId });
    if (filters?.facilityId) query.andWhere('shift.facilityId = :facilityId', { facilityId: filters.facilityId });
    if (filters?.roomId) query.andWhere('shift.roomId = :roomId', { roomId: filters.roomId });
    if (filters?.status) query.andWhere('shift.status = :status', { status: filters.status });
    if (filters?.dateFrom) query.andWhere('shift.shiftDate >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters?.dateTo) query.andWhere('shift.shiftDate <= :dateTo', { dateTo: filters.dateTo });
    return query;
  }

  private resolveUpdateAction(input: UpdateShiftWithAuditInput['changes']): string {
    const actions: string[] = [];
    if (input.assigneeChanged) actions.push('assignee_changed');
    if (input.roomChanged) actions.push('room_changed');
    if (input.scheduleChanged) actions.push('schedule_changed');
    if (input.roleChanged) actions.push('role_changed');
    if (input.capacityChanged) actions.push('capacity_changed');
    if (input.statusChanged) actions.push('status_changed');
    if (input.noteChanged) actions.push('note_changed');
    return actions.join(',') || 'updated';
  }

  private filterOverlappingShifts(input: ShiftConflictInput, shifts: DoctorShift[]): DoctorShift[] {
    return (shifts ?? []).filter(shift => {
      if (!shift.shiftDate || !shift.startTime || !shift.endTime) return true;
      return shiftIntervalsOverlap(
        input.shiftDate,
        input.startTime,
        input.endTime,
        this.toDateOnly(shift.shiftDate),
        shift.startTime,
        shift.endTime,
      );
    });
  }

  private toDateOnly(value: string | Date): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private dateTimeToTime(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    return `${hour}:${minute}:${second}`;
  }

  private buildDetailsQuery(): SelectQueryBuilder<DoctorShift> {
    return this.repository
      .createQueryBuilder('shift')
      .innerJoin('facilities', 'facility', 'facility.id = shift.facilityId')
      .innerJoin('staffs', 'staff', 'staff.id = shift.staffId')
      .leftJoin('doctors', 'doctor', 'doctor.staff_id = staff.id')
      .leftJoin('roles', 'role', 'role.id = shift.roleId')
      .leftJoin('shift_slots', 'slot', 'slot.id = shift.slotId')
      .leftJoin('rooms', 'room', 'room.id = shift.roomId')
      .leftJoin('room_types', 'roomType', 'roomType.id = room.roomTypeId')
      .select('shift.id', 'id')
      .addSelect('doctor.id', 'doctorId')
      .addSelect('shift.staffId', 'staffId')
      .addSelect('shift.roleId', 'roleId')
      .addSelect('shift.slotId', 'slotId')
      .addSelect('shift.facilityId', 'facilityId')
      .addSelect('shift.roomId', 'roomId')
      // DATE column qua raw query có thể bị mysql driver ép thành Date UTC.
      // Format thẳng ở DB để API luôn trả YYYY-MM-DD, giúp weekly group đúng ngày.
      .addSelect("DATE_FORMAT(shift.shiftDate, '%Y-%m-%d')", 'shiftDate')
      .addSelect('shift.startTime', 'startTime')
      .addSelect('shift.endTime', 'endTime')
      .addSelect('shift.maxAppointments', 'maxAppointments')
      .addSelect('shift.status', 'status')
      .addSelect('shift.note', 'note')
      .addSelect('shift.createdAt', 'createdAt')
      .addSelect('shift.updatedAt', 'updatedAt')
      .addSelect('staff.name', 'doctorName')
      .addSelect('staff.name', 'staffName')
      .addSelect('role.name', 'roleName')
      .addSelect('doctor.title', 'doctorTitle')
      .addSelect('doctor.specialty', 'doctorSpecialty')
      .addSelect('facility.code', 'facilityCode')
      .addSelect('facility.name', 'facilityName')
      .addSelect('room.name', 'roomName')
      .addSelect('room.roomTypeId', 'roomTypeId')
      .addSelect('roomType.code', 'roomType')
      .addSelect('roomType.name', 'roomTypeName')
      .addSelect('slot.code', 'slotCode')
      .addSelect('slot.name', 'slotName');
  }

  private async paginateRaw<T>(
    query: SelectQueryBuilder<DoctorShift>,
    options?: { page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const total = await query.clone().getCount();
    const items = await query.offset((page - 1) * limit).limit(limit).getRawMany<T>();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  
  

  async insertMonthlyShifts(shifts: DeepPartial<DoctorShift>[]): Promise<DoctorShift[]> {
    return this.saveMany(shifts);
  }

}
