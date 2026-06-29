import { DeepPartial } from 'typeorm';
import { StaffProfile } from '../entities/staff-profiles.entity';

export const STAFF_PROFILE_REPOSITORY = Symbol('STAFF_PROFILE_REPOSITORY');

export interface IStaffProfileRepository {
  findById(id: string): Promise<StaffProfile | null>;
  findByEmail(email: string): Promise<StaffProfile | null>;
  findByEmailWithPassword(email: string): Promise<StaffProfile | null>;
  findByEmployeeCode(employeeCode: string): Promise<StaffProfile | null>;
  findAll(): Promise<StaffProfile[]>;
  create(data: DeepPartial<StaffProfile>): Promise<StaffProfile>;
  save(staffProfile: StaffProfile): Promise<StaffProfile>;
  findByPersonalEmail(email: string): Promise<StaffProfile | null>;
  updateStaffProfile(id: string, data: DeepPartial<StaffProfile>): Promise<StaffProfile | null>;
  generateStaffEmailFromName(name: string): Promise<string>;
  generateStaffPassword(): string;
  generateStaffEmployeeCode(): Promise<string>;
  checkPersonalEmailExists(email: string): Promise<boolean>;
}
