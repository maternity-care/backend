import { DeepPartial } from 'typeorm';
import { Staff } from '../entities/staff.entity';

export const STAFF_PROFILE_REPOSITORY = Symbol('STAFF_PROFILE_REPOSITORY');

export interface IStaffProfileRepository {
  findById(id: string): Promise<Staff | null>;
  findByEmail(email: string): Promise<Staff | null>;
  findByEmailWithPassword(email: string): Promise<Staff | null>;
  findByPhone(phone: string): Promise<Staff | null>;
  findByEmployeeCode(employeeCode: string): Promise<Staff | null>;
  findAll(): Promise<Staff[]>;
  create(data: DeepPartial<Staff>): Promise<Staff>;
  save(staff: Staff): Promise<Staff>;
  findByPersonalEmail(email: string): Promise<Staff | null>;
  updateStaffProfile(id: string, data: DeepPartial<Staff>): Promise<Staff | null>;
  generateStaffEmailFromName(name: string): Promise<string>;
  generateStaffPassword(): string;
  generateStaffEmployeeCode(): Promise<string>;
  checkPersonalEmailExists(email: string): Promise<boolean>;
}
