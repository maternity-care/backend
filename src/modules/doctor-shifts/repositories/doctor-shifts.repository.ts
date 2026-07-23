import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { DoctorShift } from '../entities/shift.entity';
import { SearchDoctorShiftDto } from '../dto/requests/search-doctor-shift.dto';
import { DoctorShiftWithDetails, IDoctorShiftsRepository } from '../interfaces/doctor-shifts-repository.interface';
import { ShiftConflictInput } from '../interfaces/shifts-conflict-input.interface';
import { ShiftConflicts } from '../interfaces/shift-conflicts.interface';
import { DoctorAppointmentBlock } from '../interfaces/doctor-appointment-block.interface';
import {
  AppointmentDisruptionResolutionStatus,
  AppointmentStatus,
  DisruptionStatus,
  DoctorShiftStatus,
} from '../../../common/constants/status.enum';

@Injectable()
export class DoctorShiftsRepository implements IDoctorShiftsRepository {
  // Repository này là lớp truy cập dữ liệu của module doctor-shifts.
  // Controller/Service không nên viết SQL trực tiếp; mọi thao tác DB về ca trực đi qua class này.
  constructor(
    // InjectRepository: là một decorator của NestJS, 
    // được sử dụng để tiêm (inject) một repository của TypeORM vào trong một class.
    // Repository: là một lớp của TypeORM, cung cấp các phương thức để tương tác với cơ sở dữ liệu.
    // DoctorShift: là một entity, đại diện cho bảng doctor_shifts trong cơ sở dữ liệu.
    // Vì vậy, @InjectRepository(DoctorShift) sẽ tiêm một repository của 
    // entity DoctorShift vào trong class DoctorShiftsRepository.
    //trong doctorShift có các thuộc tính như id, doctorId, facilityId, roomId, shiftDate, startTime, endTime, maxAppointments, status, createdAt và updatedAt.
    //quan trọng có @Entity('doctor_shifts') để xác định bảng trong cơ sở dữ liệu mà entity này đại diện.

    @InjectRepository(DoctorShift)
    
    private readonly repository: Repository<DoctorShift>,
  ) {}

  create(data: DeepPartial<DoctorShift>): DoctorShift {
    return this.repository.create(data);
  }

  // Lưu một ca trực xuống DB. TypeORM sẽ tự insert hoặc update tùy entity có id hay chưa.
  save(shift: DoctorShift): Promise<DoctorShift> {
    return this.repository.save(shift);
  }

  // Lưu nhiều ca trực cùng lúc, dùng cho bulk-create và copy-week.
  saveMany(shifts: DeepPartial<DoctorShift>[]): Promise<DoctorShift[]> {
    return this.repository.save(shifts);
  }

  // Hard delete khỏi DB; service chỉ nên gọi khi đã chắc chắn ca chưa có appointment liên quan.
  async remove(shift: DoctorShift): Promise<void> {
    await this.repository.remove(shift);
  }

  // Tìm ca theo id và loại các ca đã soft-delete/cancel bằng deletedAt.
  findById(id: string): Promise<DoctorShift | null> {
    return this.repository
      .createQueryBuilder('shift')
      .where('shift.id = :id', { id })
      .andWhere('shift.deletedAt IS NULL')
      .getOne();
  }

  async findDetailsById(id: string): Promise<DoctorShiftWithDetails | null> {
    return (await this.buildDetailsQuery()
      .where('shift.id = :id', { id })
      .andWhere('shift.deletedAt IS NULL')
      .getRawOne<DoctorShiftWithDetails>()) ?? null;
  }

  findAll(filters?: SearchDoctorShiftDto): Promise<DoctorShiftWithDetails[]> {
    return this.buildListQuery(filters).getRawMany<DoctorShiftWithDetails>();
  }

  // Dùng chung buildListQuery với findAll để tránh lệch logic filter giữa list thường và list phân trang.
  findAllPaginated(filters?: SearchDoctorShiftDto) {
    return this.paginateRaw<DoctorShiftWithDetails>(this.buildListQuery(filters), {
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
        .where('doctor_shifts.shiftDate = :shiftDate', { shiftDate: input.shiftDate })
        .andWhere('doctor_shifts.deletedAt IS NULL')
        // Hai dòng dưới là điều kiện kiểm tra giao nhau giữa 2 khoảng giờ.
        .andWhere('doctor_shifts.startTime < :endTime', { endTime: input.endTime })
        .andWhere('doctor_shifts.endTime > :startTime', { startTime: input.startTime })
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
    const doctorQuery = baseQuery(['available', 'full', 'off']).andWhere('doctor_shifts.doctorId = :doctorId', {
      doctorId: input.doctorId,
    });
    // Conflict theo phòng: chỉ kiểm tra nếu ca có roomId.
    // OFF không dùng phòng nên roomQuery chỉ xét available/full.
    const roomQuery = input.roomId
      ? baseQuery(['available', 'full']).andWhere('doctor_shifts.roomId = :roomId', { roomId: input.roomId })
      : null;
      // Promise.all: dùng để thực hiện nhiều promise song song và chờ tất cả chúng hoàn thành.
      // Trong trường hợp này, nó được sử dụng để thực hiện hai truy vấn cơ sở dữ liệu song song: 
      // doctorQuery và roomQuery.
    const [doctorConflicts, roomConflicts] = await Promise.all([
      doctorQuery.getMany(),
      roomQuery ? roomQuery.getMany() : Promise.resolve([]),
    ]);
    return { doctorConflicts, roomConflicts };
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
    if (doctorId) query.andWhere('shift.doctorId = :doctorId', { doctorId });
    return query.getMany();
  }

  findWeeklyWithDetails(
    facilityId: string,
    startDate: string,
    endDate: string,
    doctorId?: string,
  ): Promise<DoctorShiftWithDetails[]> {
    const query = this.buildDetailsQuery()
      .where('shift.facilityId = :facilityId', { facilityId })
      .andWhere('shift.deletedAt IS NULL')
      .andWhere('shift.shiftDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.startTime', 'ASC');

    if (doctorId) query.andWhere('shift.doctorId = :doctorId', { doctorId });
    return query.getRawMany<DoctorShiftWithDetails>();
  }

  findDoctorShiftsForDate(
    facilityId: string,
    doctorId: string,
    date: string,
  ): Promise<DoctorShift[]> {
    // Lấy các ca có thể nhận lịch hẹn của một bác sĩ trong một ngày.
    // Chỉ lấy available/full vì cancelled/off không dùng để sinh slot đặt lịch.
    return this.repository
      .createQueryBuilder('shift')
      .where('shift.facilityId = :facilityId', { facilityId })
      .andWhere('shift.deletedAt IS NULL')
      .andWhere('shift.doctorId = :doctorId', { doctorId })
      .andWhere('shift.shiftDate = :date', { date })
      .andWhere('shift.status IN (:...statuses)', {
        statuses: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.FULL],
      })
      .orderBy('shift.startTime', 'ASC')
      .getMany();
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

    return this.repository.manager
      .createQueryBuilder()
      // Dùng raw query vì Appointment entity nằm ngoài module doctor-shifts,
      // và ở đây chỉ cần vài field nhỏ để tính slot, không cần load full entity.
      .select('appointment.id', 'id')
      .addSelect('appointment.scheduled_start', 'scheduledStart')
      .addSelect('appointment.scheduled_end', 'scheduledEnd')
      .addSelect('appointment.status', 'status')
      .from('appointments', 'appointment')
      .where('appointment.facility_id = :facilityId', { facilityId })
      .andWhere('appointment.doctor_id = :doctorId', { doctorId })
      // DATE(...) giúp so sánh phần ngày của scheduled_start với date dạng YYYY-MM-DD.
      .andWhere('DATE(appointment.scheduled_start) = :date', { date })
      .andWhere('appointment.status IN (:...activeStatuses)', { activeStatuses })
      .orderBy('appointment.scheduled_start', 'ASC')
      .getRawMany<DoctorAppointmentBlock>();
  }

  findAppointmentsForShift(shift: DoctorShift, activeOnly = false): Promise<DoctorAppointmentBlock[]> {
    // Tìm appointment nằm trong khoảng giờ của một ca trực cụ thể.
    // Dùng khi xóa/hủy ca để biết appointment nào bị ảnh hưởng.
    const query = this.repository.manager
      .createQueryBuilder()
      .select('appointment.id', 'id')
      .addSelect('appointment.doctor_id', 'doctorId')
      .addSelect('appointment.room_id', 'roomId')
      .addSelect('appointment.scheduled_start', 'scheduledStart')
      .addSelect('appointment.scheduled_end', 'scheduledEnd')
      .addSelect('appointment.status', 'status')
      .from('appointments', 'appointment')
      .where('appointment.facility_id = :facilityId', { facilityId: shift.facilityId })
      .andWhere('appointment.doctor_id = :doctorId', { doctorId: shift.doctorId })
      .andWhere('DATE(appointment.scheduled_start) = :shiftDate', { shiftDate: shift.shiftDate })
      // Hai dòng TIME(...) dưới kiểm tra appointment có giao với giờ của ca không.
      .andWhere('TIME(appointment.scheduled_start) < :endTime', { endTime: shift.endTime })
      .andWhere('TIME(appointment.scheduled_end) > :startTime', { startTime: shift.startTime });

    if (activeOnly) {
      // activeOnly = true nghĩa là chỉ lấy các appointment còn cần xử lý khi ca bị hủy.
      query.andWhere('appointment.status IN (:...statuses)', {
        statuses: [
          AppointmentStatus.PENDING_PAYMENT,
          AppointmentStatus.BOOKED,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CHECKED_IN,
          AppointmentStatus.IN_PROGRESS,
        ],
      });
    }

    return query.orderBy('appointment.scheduled_start', 'ASC').getRawMany<DoctorAppointmentBlock>();
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
        deletedAt: new Date(),
        deletedBy: changedBy ?? null,
        deleteReason: reason ?? null,
      });

      // Ghi audit log để sau này biết ai hủy, hủy từ trạng thái nào sang trạng thái nào, lý do gì.
      await manager.createQueryBuilder().insert().into('doctor_shift_change_logs').values({
        shift_id: shift.id,
        action: 'cancelled',
        old_status: shift.status,
        new_status: DoctorShiftStatus.CANCELLED,
        old_doctor_id: shift.doctorId,
        new_doctor_id: shift.doctorId,
        old_room_id: shift.roomId,
        new_room_id: shift.roomId,
        old_start_time: shift.startTime,
        new_start_time: shift.startTime,
        old_end_time: shift.endTime,
        new_end_time: shift.endTime,
        reason: reason ?? null,
        changed_by: changedBy ?? null,
      }).execute();

      let disruptionId: string | undefined;
      if (affectedAppointments.length > 0) {
        // shift_disruptions là "hồ sơ sự cố" chung cho lần hủy ca này.
        // Một disruption có thể ảnh hưởng nhiều appointment.
        const disruptionResult = await manager.createQueryBuilder().insert().into('shift_disruptions').values({
          type: 'doctor_shift_cancelled',
          source_type: 'doctor_shift',
          source_id: shift.id,
          facility_id: shift.facilityId,
          doctor_shift_id: shift.id,
          room_id: shift.roomId ?? null,
          reason: reason ?? null,
          status: DisruptionStatus.OPEN,
          created_by: changedBy ?? null,
        }).execute();

        // TypeORM trả id record vừa insert trong identifiers.
        // Ép sang string để đồng nhất với kiểu id bigint đang dùng trong entity.
        disruptionId = String(disruptionResult.identifiers[0]?.id);

        // Mỗi appointment bị ảnh hưởng được ghi thành một item riêng.
        // Sau này các API reschedule/reassign/cancel sẽ xử lý từng item này.
        await manager.createQueryBuilder().insert().into('appointment_disruption_items').values(
          affectedAppointments.map(appointment => ({
            disruption_id: disruptionId,
            appointment_id: appointment.id,
            old_doctor_id: shift.doctorId,
            old_room_id: shift.roomId ?? null,
            old_scheduled_start: appointment.scheduledStart,
            old_scheduled_end: appointment.scheduledEnd,
            resolution_status: AppointmentDisruptionResolutionStatus.PENDING,
          })),
        ).execute();
      }

      // Đọc lại ca sau khi update để trả về trạng thái mới nhất cho service/controller.
      const updatedShift = await manager.findOneByOrFail(DoctorShift, { id: shift.id });
      return { shift: updatedShift, disruptionId };
    });
  }

  // return true nếu bác sĩ được chỉ định cho cơ sở y tế, ngược lại return false.
  async isDoctorAssignedToFacility(doctorId: string, facilityId: string): Promise<boolean> {
    // Bác sĩ không nối trực tiếp với facility.
    // Luồng hiện tại là: doctors.staff_id -> facility_staff.staff_id -> facility_staff.facility_id.
    // Vì vậy cần join doctors với facility_staff để kiểm tra bác sĩ có thuộc cơ sở này không.
    // this.repository.manager: là một đối tượng quản lý kết nối cơ sở dữ liệu trong TypeORM,
    // được sử dụng để thực hiện các thao tác cơ sở dữ liệu như truy vấn, lưu trữ, xóa, v.v.
    const row = await this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('doctors', 'doctor')
      // staff.staff_id = doctor.staff_id nghĩa là lấy assignment cơ sở của staff đứng sau bác sĩ đó.
      .innerJoin('facility_staff', 'staff', 'staff.staff_id = doctor.staff_id')
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

  private buildListQuery(filters?: SearchDoctorShiftDto): SelectQueryBuilder<DoctorShift> {
    // Query nền cho API list/search ca trực.
    // Tất cả list mặc định bỏ qua deletedAt để không hiện ca đã soft-delete/cancel.
    const query = this.buildDetailsQuery()
      .where('shift.deletedAt IS NULL')
      .orderBy('shift.shiftDate', 'DESC')
      .addOrderBy('shift.startTime', 'ASC');
    if (filters?.doctorId) query.andWhere('shift.doctorId = :doctorId', { doctorId: filters.doctorId });
    if (filters?.facilityId) query.andWhere('shift.facilityId = :facilityId', { facilityId: filters.facilityId });
    if (filters?.roomId) query.andWhere('shift.roomId = :roomId', { roomId: filters.roomId });
    if (filters?.status) query.andWhere('shift.status = :status', { status: filters.status });
    if (filters?.dateFrom) query.andWhere('shift.shiftDate >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters?.dateTo) query.andWhere('shift.shiftDate <= :dateTo', { dateTo: filters.dateTo });
    return query;
  }

  private buildDetailsQuery(): SelectQueryBuilder<DoctorShift> {
    return this.repository
      .createQueryBuilder('shift')
      .innerJoin('facilities', 'facility', 'facility.id = shift.facilityId')
      .innerJoin('doctors', 'doctor', 'doctor.id = shift.doctorId')
      .innerJoin('staffs', 'staff', 'staff.id = doctor.staff_id')
      .leftJoin('rooms', 'room', 'room.id = shift.roomId')
      .select('shift.id', 'id')
      .addSelect('shift.doctorId', 'doctorId')
      .addSelect('shift.facilityId', 'facilityId')
      .addSelect('shift.roomId', 'roomId')
      // DATE column qua raw query có thể bị mysql driver ép thành Date UTC.
      // Format thẳng ở DB để API luôn trả YYYY-MM-DD, giúp weekly group đúng ngày.
      .addSelect("DATE_FORMAT(shift.shiftDate, '%Y-%m-%d')", 'shiftDate')
      .addSelect('shift.startTime', 'startTime')
      .addSelect('shift.endTime', 'endTime')
      .addSelect('shift.maxAppointments', 'maxAppointments')
      .addSelect('shift.status', 'status')
      .addSelect('shift.createdAt', 'createdAt')
      .addSelect('shift.updatedAt', 'updatedAt')
      .addSelect('staff.name', 'doctorName')
      .addSelect('doctor.title', 'doctorTitle')
      .addSelect('doctor.specialty', 'doctorSpecialty')
      .addSelect('facility.code', 'facilityCode')
      .addSelect('facility.name', 'facilityName')
      .addSelect('room.name', 'roomName')
      .addSelect('room.room_type', 'roomType');
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
