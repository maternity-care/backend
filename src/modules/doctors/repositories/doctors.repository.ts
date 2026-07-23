import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { IDoctorsRepository } from '../interfaces/doctors-repository.interface';

@Injectable()
export class DoctorsRepository implements IDoctorsRepository {
  constructor(
    @InjectRepository(Doctor)
    private readonly repository: Repository<Doctor>,
  ) {}

  create(data: DeepPartial<Doctor>): Doctor {
    return this.repository.create(data);
  }

  save(doctor: Doctor): Promise<Doctor> {
    return this.repository.save(doctor);
  }

  async findById(id: string): Promise<Doctor | null> {
    return this.repository.findOne({ where: { id } });
  }

  findAll(): Promise<Doctor[]> {
    return this.repository.find({ relations: { staff: true }, order: { createdAt: 'DESC' } });
  }

  findByStaffId(staffId: string): Promise<Doctor | null> {
    return this.repository.findOne({ where: { staffId } });
  }

  findByLicenseNo(licenseNo: string): Promise<Doctor | null> {
    return this.repository.findOne({ where: { licenseNo } });
  }

  async remove(doctor: Doctor): Promise<void> {
    await this.repository.remove(doctor);
  }

  async findByPersonalEmail(email: string): Promise<Doctor | null> {
    const doctor = await this.repository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.staff', 'staff')
      .where('staff.email = :email', { email })
      .getOne();
    return doctor || null;
  }
}
