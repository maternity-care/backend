import { DeepPartial } from 'typeorm';
import { StaffProfile } from '../entities/staff.entity';

export interface IStaffProfileService {
  findById(id: string): Promise<StaffProfile | null>;
  findByEmail(email: string): Promise<StaffProfile | null>;
  findByEmployeeCode(employeeCode: string): Promise<StaffProfile | null>;
  findAll(): Promise<StaffProfile[]>;
  create(data: DeepPartial<StaffProfile>): Promise<StaffProfile>;
  save(staffProfile: StaffProfile): Promise<StaffProfile>;
  findByPersonalEmail(email: string): Promise<StaffProfile | null>;
  updateStaffProfile(id: string, data: DeepPartial<StaffProfile>): Promise<StaffProfile | null>;
}
