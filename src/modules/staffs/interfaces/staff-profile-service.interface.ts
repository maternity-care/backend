import { DeepPartial } from 'typeorm';
import { Staff } from '../entities/staff.entity';

export interface IStaffProfileService {
  findById(id: string): Promise<Staff | null>;
  findByEmail(email: string): Promise<Staff | null>;
  findByEmployeeCode(employeeCode: string): Promise<Staff | null>;
  findAll(): Promise<Staff[]>;
  create(data: DeepPartial<Staff>): Promise<Staff>;
  save(staff: Staff): Promise<Staff>;
  findByPersonalEmail(email: string): Promise<Staff | null>;
  updateStaffProfile(id: string, data: DeepPartial<Staff>): Promise<Staff | null>;
}
