import { DeepPartial } from 'typeorm';
import { Doctor } from '../entities/doctors.entity';

export const DOCTORS_REPOSITORY = 'DOCTORS_REPOSITORY';

export interface IDoctorsRepository {
  findById(id: string): Promise<Doctor | null>;
  findAll(): Promise<Doctor[]>;
  create(data: DeepPartial<Doctor>): Doctor;
  save(doctor: Doctor): Promise<Doctor>;
  remove(doctor: Doctor): Promise<void>;
  findByStaffId(staffId: string): Promise<Doctor | null>;
  findByLicenseNo(licenseNo: string): Promise<Doctor | null>;
  findByPersonalEmail(email: string): Promise<Doctor | null>;
}
