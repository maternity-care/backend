import { DeepPartial } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { IStaffProfileRepository } from './interfaces/staff-profile-repository.interface';
import { IStaffProfileService } from './interfaces/staff-profile-service.interface';

export class StaffProfileService implements IStaffProfileService {
  constructor(private readonly staffProfileRepository: IStaffProfileRepository) {}

  async findById(id: string): Promise<Staff | null> {
    return this.staffProfileRepository.findById(id);
  }

  async findByEmail(email: string): Promise<Staff | null> {
    return this.staffProfileRepository.findByEmail(email);
  }

  async findByEmployeeCode(employeeCode: string): Promise<Staff | null> {
    return this.staffProfileRepository.findByEmployeeCode(employeeCode);
  }

  async findAll(): Promise<Staff[]> {
    return this.staffProfileRepository.findAll();
  }

  async create(data: DeepPartial<Staff>): Promise<Staff> {
    return this.staffProfileRepository.create(data);
  }

  async save(staff: Staff): Promise<Staff> {
    return this.staffProfileRepository.save(staff);
  }

  async findByPersonalEmail(email: string): Promise<Staff | null> {
    return this.staffProfileRepository.findByPersonalEmail(email);
  }

  async updateStaffProfile(id: string, data: DeepPartial<Staff>): Promise<Staff | null> {
    return this.staffProfileRepository.updateStaffProfile(id, data);
  }
}
