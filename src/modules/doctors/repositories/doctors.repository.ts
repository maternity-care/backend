import { Staff } from './../../staffs/entities/staff.entity';
import { ActiveStatus } from './../../../common/constants/status.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Like, Repository } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { IDoctorsRepository } from '../interfaces/doctors-repository.interface';
import { SearchDoctorDto } from '../dto/requests/search-doctor.dto';

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

  async findAll(filters?: SearchDoctorDto): Promise<{ data: Doctor[]; count: number }> {
    const where: FindOptionsWhere<Doctor> = {};
    const staffWhere: FindOptionsWhere<Staff> = {};

    if (filters?.licenseNo) {
      where.licenseNo = Like(`%${filters.licenseNo}%`);
    }

    if (filters?.name) {
      staffWhere.name = Like(`%${filters.name}%`);
    }

    if (filters?.employeeCode) {
      staffWhere.employeeCode = Like(`%${filters.employeeCode}%`);
    }

    if (filters?.personalEmail) {
      staffWhere.personalEmail = Like(`%${filters.personalEmail}%`);
    }

    if (filters?.email) {
      staffWhere.email = Like(`%${filters.email}%`);
    }

    if (filters?.phone) {
      staffWhere.phone = Like(`%${filters.phone}%`);
    }

    if (filters?.specialty) {
      where.specialty = Like(`%${filters.specialty}%`);
    }

    if (filters?.status) {
      where.status = filters.status === 'active' ? ActiveStatus.ACTIVE : ActiveStatus.INACTIVE;
    }

    if (filters?.facilityId) {
      staffWhere.facilityId = filters.facilityId;
    }

    if (filters?.filterYearsOfExperienceLevel) {
      where.yearsOfExperience = filters.filterYearsOfExperienceLevel;
    }

    const sortYoE = filters?.sortYearsOfExperience || 'DESC';

    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.max(1, Number(filters?.limit) || 20);

    const dataOut = await this.repository.findAndCount({
      relations: { staff: true },
      where: {
        ...where,
        staff: staffWhere,
      },
      order: { yearsOfExperience: sortYoE, createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: dataOut[0],
      count: dataOut[1],
    };
  }

  findByFacilityId(facilityId: string): Promise<Doctor[]> {
    return this.repository.find({
      relations: { staff: true },
      where: {
        status: ActiveStatus.ACTIVE,
        staff: { facilityId: facilityId },
      },
    });
  }

  async findByStaffId(staffId: string): Promise<Doctor | null> {
    const doctor = await this.repository.findOne({
      where: { staffId },
      relations: { staff: true },
    });
    if (!doctor) {
      return null;
    }
    return {
      ...doctor,
      staff: {
        ...doctor.staff,
        password: '',
      },
    };
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
