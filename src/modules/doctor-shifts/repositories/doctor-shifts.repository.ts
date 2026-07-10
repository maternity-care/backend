import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { DoctorShift } from '../entities/doctor-shifts.entity';
import { paginate } from '../../../common/helpers/pagination';
import { SearchDoctorShiftDto } from '../dto/requests/search-doctor-shift.dto';
import { IDoctorShiftsRepository } from '../interfaces/doctor-shifts-repository.interface';
import { ShiftConflictInput } from '../interfaces/shifts-conflict-input.interface';
import { ShiftConflicts } from '../interfaces/shift-conflicts.interface';
import { DoctorAppointmentBlock } from '../interfaces/doctor-appointment-block.interface';
import { AppointmentStatus, DoctorShiftStatus } from '../../../common/constants/status.enum';

@Injectable()
export class DoctorShiftsRepository implements IDoctorShiftsRepository {
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

  save(shift: DoctorShift): Promise<DoctorShift> {
    return this.repository.save(shift);
  }

  saveMany(shifts: DeepPartial<DoctorShift>[]): Promise<DoctorShift[]> {
    return this.repository.save(shifts);
  }

  async remove(shift: DoctorShift): Promise<void> {
    await this.repository.remove(shift);
  }

  findById(id: string): Promise<DoctorShift | null> {
    return this.repository.findOne({ where: { id } });
  }

  findAll(filters?: SearchDoctorShiftDto): Promise<DoctorShift[]> {
    return this.buildListQuery(filters).getMany();
  }

  findAllPaginated(filters?: SearchDoctorShiftDto) {
    return paginate(this.buildListQuery(filters), {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  async findConflicts(input: ShiftConflictInput): Promise<ShiftConflicts> {
    //b1: baseQuery: tạo một truy vấn cơ sở dữ liệu để 
    // tìm kiếm các ca làm việc của bác sĩ dựa trên các điều kiện được cung cấp trong input.

    const baseQuery = (statuses: string[]) => {
      const query = this.repository
      // createQueryBuilder: tạo một truy vấn cơ sở dữ liệu để 
      // tìm kiếm các ca làm việc của bác sĩ
      // dựa trên các điều kiện được cung cấp trong input.
      //doctor_shifts: là tên của bảng trong cơ sở dữ liệu mà truy vấn sẽ được thực hiện.
        .createQueryBuilder('doctor_shifts')
        .where('doctor_shifts.shiftDate = :shiftDate', { shiftDate: input.shiftDate })
        .andWhere('doctor_shifts.startTime < :endTime', { endTime: input.endTime })
        .andWhere('doctor_shifts.endTime > :startTime', { startTime: input.startTime })
        // IN (:...statuses): là một điều kiện trong truy vấn SQL,
        // được sử dụng để kiểm tra xem giá trị của một cột có nằm trong một tập hợp các giá trị hay không.
        .andWhere('doctor_shifts.status IN (:...statuses)', { statuses });
      if (input.excludeShiftId) {
        query.andWhere('doctor_shifts.id != :excludeShiftId', { excludeShiftId: input.excludeShiftId });
      }
      return query;
    };

    const doctorQuery = baseQuery(['available', 'full', 'off']).andWhere('doctor_shifts.doctorId = :doctorId', {
      doctorId: input.doctorId,
    });
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
    const query = this.repository
      .createQueryBuilder('shift')
      .where('shift.facilityId = :facilityId', { facilityId })
      .andWhere('shift.shiftDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.startTime', 'ASC');
    if (doctorId) query.andWhere('shift.doctorId = :doctorId', { doctorId });
    return query.getMany();
  }

  findDoctorShiftsForDate(
    facilityId: string,
    doctorId: string,
    date: string,
  ): Promise<DoctorShift[]> {
    return this.repository
      .createQueryBuilder('shift')
      .where('shift.facilityId = :facilityId', { facilityId })
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
    const activeStatuses = [
      AppointmentStatus.PENDING_PAYMENT,
      AppointmentStatus.BOOKED,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CHECKED_IN,
      AppointmentStatus.IN_PROGRESS,
    ];

    return this.repository.manager
      .createQueryBuilder()
      .select('appointment.id', 'id')
      .addSelect('appointment.scheduled_start', 'scheduledStart')
      .addSelect('appointment.scheduled_end', 'scheduledEnd')
      .addSelect('appointment.status', 'status')
      .from('appointments', 'appointment')
      .where('appointment.facility_id = :facilityId', { facilityId })
      .andWhere('appointment.doctor_id = :doctorId', { doctorId })
      .andWhere('DATE(appointment.scheduled_start) = :date', { date })
      .andWhere('appointment.status IN (:...activeStatuses)', { activeStatuses })
      .orderBy('appointment.scheduled_start', 'ASC')
      .getRawMany<DoctorAppointmentBlock>();
  }

  // return true nếu bác sĩ được chỉ định cho cơ sở y tế, ngược lại return false.
  async isDoctorAssignedToFacility(doctorId: string, facilityId: string): Promise<boolean> {
    // this.repository.manager: là một đối tượng quản lý kết nối cơ sở dữ liệu trong TypeORM,
    // được sử dụng để thực hiện các thao tác cơ sở dữ liệu như truy vấn, lưu trữ, xóa, v.v.
    const row = await this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('doctors', 'doctor')
      .innerJoin('facility_staff', 'staff', 'staff.staff_id = doctor.staff_id')
      .where('doctor.id = :doctorId', { doctorId })
      .andWhere('doctor.status = :active', { active: 'active' })
      .andWhere('staff.facility_id = :facilityId', { facilityId })
      .andWhere('staff.status = :active', { active: 'active' })
      .getRawOne<{ count: string }>(); 
      //set sang số nguyên
      // phát hiện trả 1 không có thì trả 0
    return Number(row?.count ?? 0) > 0;
  }

  private buildListQuery(filters?: SearchDoctorShiftDto): SelectQueryBuilder<DoctorShift> {
    const query = this.repository
      .createQueryBuilder('shift')
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


  

  async insertMonthlyShifts(shifts: DeepPartial<DoctorShift>[]): Promise<DoctorShift[]> {
    return this.saveMany(shifts);
  }

}
