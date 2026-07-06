import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DOCTOR_SHIFT_CONSTANT } from '../../common/constants/doctor-shift.constant';
import { DoctorShift } from './entities/doctor-shifts.entity';
import { CheckShiftConflictDto } from './dto/requests/check-shift-conflict.dto';
import { CreateDoctorShiftDto } from './dto/requests/create-doctor-shift.dto';
import { SearchDoctorShiftDto } from './dto/requests/search-doctor-shift.dto';
import { UpdateDoctorShiftDto } from './dto/requests/update-doctor-shift.dto';
import { addDays, validateDateRange, validateShiftId } from './helpers/doctor-shifts.helper';
import {
  DOCTOR_SHIFTS_REPOSITORY,
  IDoctorShiftsRepository,
} from './interfaces/doctor-shifts-repository.interface';
import { DoctorShiftsValidator } from './validators/doctor-shifts.validator';

/**
 * Service chính chỉ giữ các use case mà controller gọi.
 * Validation chi tiết nằm trong DoctorShiftsValidator và doctor-shifts.helper.ts.
 */
@Injectable()
export class DoctorShiftsService {
  constructor(
    @Inject(DOCTOR_SHIFTS_REPOSITORY)
    private readonly repository: IDoctorShiftsRepository,
    private readonly validator: DoctorShiftsValidator,
  ) {}

  async create(dto: CreateDoctorShiftDto): Promise<DoctorShift> {
    await this.validator.validateForCreate(dto);
    return this.repository.save(this.repository.create(dto));
  }

  findAll(filters?: SearchDoctorShiftDto): Promise<DoctorShift[]> {
    validateDateRange(filters?.dateFrom, filters?.dateTo);
    return this.repository.findAll(filters);
  }

  findAllPaginated(filters?: SearchDoctorShiftDto) {
    validateDateRange(filters?.dateFrom, filters?.dateTo);
    return this.repository.findAllPaginated(filters);
  }

  async findById(id: string): Promise<DoctorShift> {
    validateShiftId(id);
    const shift = await this.repository.findById(id);
    if (!shift) throw new NotFoundException(DOCTOR_SHIFT_CONSTANT.NOT_FOUND);
    return shift;
  }

  async update(id: string, dto: UpdateDoctorShiftDto): Promise<DoctorShift> {
    const shift = await this.findById(id);
    // Merged: tạo một đối tượng mới bằng cách kết hợp các thuộc tính của shift và dto.
    
    const merged = { ...shift, ...dto } as DoctorShift;
    await this.validator.validateForUpdate(merged);
    Object.assign(shift, dto);
    return this.repository.save(shift);
  }

  async remove(id: string): Promise<void> {
    await this.repository.remove(await this.findById(id));
  }

  async checkConflicts(dto: CheckShiftConflictDto) {
    await this.validator.validateForConflictCheck(dto);
    const conflicts = await this.repository.findConflicts(dto);
    return {
      hasConflict: conflicts.doctorConflicts.length > 0 || conflicts.roomConflicts.length > 0,
      // ...: spread operator: dùng để sao chép tất cả các thuộc tính của một đối tượng vào một đối tượng khác.
      // Trong trường hợp này, nó được sử dụng để sao chép tất cả 
      // các thuộc tính của đối tượng conflicts vào đối tượng mới được trả về.
      ...conflicts,
    };
  }

  async getWeeklySchedule(facilityId: string, weekStart?: string, doctorId?: string) {
    const { start, end } = await this.validator.prepareWeeklyRange(
      facilityId,
      weekStart,
      doctorId,
    );
    const shifts = await this.repository.findWeekly(facilityId, start, end, doctorId);
    return {
      facilityId,
      weekStart: start,
      weekEnd: end,
      days: Array.from({ length: 7 }, (_, index) => {
        const date = addDays(start, index);
        return { date, shifts: shifts.filter(shift => shift.shiftDate === date) };
      }),
    };
  }
}
