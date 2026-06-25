import { DeepPartial } from 'typeorm';
import { Doctor } from '../entities/doctors.entity';

export interface IDoctorsRepository {
  findById(id: string): Promise<Doctor | null>;
  findAll(): Promise<Doctor[]>;
  create(data: DeepPartial<Doctor>): Doctor;
  save(doctor: Doctor): Promise<Doctor>;
  findByPersonalEmail(email: string): Promise<Doctor | null>;
}
