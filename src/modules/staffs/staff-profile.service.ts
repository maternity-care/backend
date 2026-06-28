import { DeepPartial } from 'typeorm';
import { StaffProfile } from './entities/staff-profiles.entity';
import { IStaffProfileRepository } from './interfaces/staff-profile-repository.interface';
import { IStaffProfileService } from './interfaces/staff-profile-service.interface';

export class StaffProfileService implements IStaffProfileService {
  constructor(private readonly staffProfileRepository: IStaffProfileRepository) {}

  async findById(id: string): Promise<StaffProfile | null> {
    return this.staffProfileRepository.findById(id);
  }

  async findByEmail(email: string): Promise<StaffProfile | null> {
    return this.staffProfileRepository.findByEmail(email);
  }

  async findByEmployeeCode(employeeCode: string): Promise<StaffProfile | null> {
    return this.staffProfileRepository.findByEmployeeCode(employeeCode);
  }

  async findAll(): Promise<StaffProfile[]> {
    return this.staffProfileRepository.findAll();
  }

  async create(data: DeepPartial<StaffProfile>): Promise<StaffProfile> {
    return this.staffProfileRepository.create(data);
  }

  async save(staffProfile: StaffProfile): Promise<StaffProfile> {
    return this.staffProfileRepository.save(staffProfile);
  }

  async findByPersonalEmail(email: string): Promise<StaffProfile | null> {
    return this.staffProfileRepository.findByPersonalEmail(email);
  }

  async updateStaffProfile(
    id: string,
    data: DeepPartial<StaffProfile>,
  ): Promise<StaffProfile | null> {
    return this.staffProfileRepository.updateStaffProfile(id, data);
  }
}
