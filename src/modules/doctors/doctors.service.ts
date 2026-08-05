import {
  IStaffProfileRepository,
  STAFF_PROFILE_REPOSITORY,
} from './../staffs/interfaces/staff-profile-repository.interface';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpdateDoctorDto } from './dto/requests/update-doctor.dto';
import { IDoctorsRepository, DOCTORS_REPOSITORY } from './interfaces/doctors-repository.interface';
import { Doctor } from './entities/doctor.entity';
import { SearchDoctorDto } from './dto/requests/search-doctor.dto';
import { CreateDoctorDto } from './dto/requests/create-doctor.dto';
import { ActiveStatus } from '../../common/constants/status.enum';

@Injectable()
export class DoctorsService {
  constructor(
    @Inject(DOCTORS_REPOSITORY)
    private readonly repository: IDoctorsRepository,
    @Inject(STAFF_PROFILE_REPOSITORY)
    private readonly staffRepository: IStaffProfileRepository,
  ) {}

  async create(dto: CreateDoctorDto): Promise<Doctor> {
    await this.ensureUniqueLicenseNo(dto.licenseNo);
    await this.ensureUniqueStaffId(dto.staffId);

    const staff = await this.staffRepository.findById(dto.staffId);
    if (!staff) {
      throw new NotFoundException('NhÃ¢n viÃªn khÃ´ng tá»“n táº¡i');
    }

    const doctor = await this.repository.save(
      Object.assign(new Doctor(), {
        staffId: dto.staffId,
        staff,
        licenseNo: dto.licenseNo,
        title: dto.title,
        specialty: dto.specialty,
        yearsOfExperience: dto.yearsOfExperience,
        workingRoomTypeId: dto.workingRoomTypeId,
        bio: dto.bio ?? '',
        status: dto.status ?? ActiveStatus.ACTIVE,
      }),
    );

    return this.findById(doctor.id);
  }

  async findAll(filters?: SearchDoctorDto): Promise<{ data: Doctor[]; count: number }> {
    return this.repository.findAll(filters);
  }

  async findByFacilityId(facilityId: string): Promise<Doctor[]> {
    return this.repository.findByFacilityId(facilityId);
  }

  async findById(id: string): Promise<Doctor> {
    const doctor = await this.repository.findById(id);
    if (!doctor) {
      throw new NotFoundException('Bác sĩ không tồn tại');
    }
    return doctor;
  }

  async findMine(user: AuthenticatedUser): Promise<Doctor> {
    if (!user?.id) {
      throw new BadRequestException('Không xác định được người dùng');
    }

    const doctor = await this.repository.findByStaffId(user.id);
    if (!doctor) {
      throw new NotFoundException('Bạn chưa được gán hồ sơ bác sĩ');
    }
    return doctor;
  }

  async update(id: string, dto: UpdateDoctorDto): Promise<Doctor> {
    const doctor = await this.findById(id);

    if (dto.licenseNo && dto.licenseNo !== doctor.licenseNo) {
      await this.ensureUniqueLicenseNo(dto.licenseNo, doctor.id);
    }

    if (dto.staffId && dto.staffId !== doctor.staffId) {
      await this.ensureUniqueStaffId(dto.staffId, doctor.id);
    }

    if (doctor.yearsOfExperience > dto.yearsOfExperience) {
      throw new BadRequestException('Mức năm kinh nghiệm không được giảm');
    }

    doctor.licenseNo = dto.licenseNo ?? doctor?.licenseNo;
    doctor.title = dto.title ?? doctor?.title;
    doctor.specialty = dto.specialty ?? doctor?.specialty;
    doctor.yearsOfExperience = dto.yearsOfExperience ?? doctor?.yearsOfExperience;
    doctor.workingRoomTypeId = dto.workingRoomTypeId ?? doctor?.workingRoomTypeId;
    doctor.bio = dto.bio ?? doctor?.bio;
    doctor.status = dto.status ?? doctor?.status;

    const staff = await this.staffRepository.findById(doctor.staffId);
    if (!staff) {
      throw new NotFoundException('Nhân viên không tồn tại');
    }

    staff.name = dto.name ?? staff.name;
    staff.phone = dto.phone ?? staff.phone;
    staff.personalEmail = dto.personalEmail ?? staff.personalEmail;
    staff.address = dto.address ?? staff.address;
    await this.staffRepository.save(staff);

    const newDoctor = this.repository.save(doctor);

    return newDoctor;
  }

  async updateMine(user: AuthenticatedUser, dto: UpdateDoctorDto): Promise<Doctor> {
    const doctor = await this.findMine(user);
    Object.assign(doctor, {
      ...dto,
      staffId: doctor.staffId,
      status: doctor.status,
      licenseNo: dto.licenseNo ?? doctor.licenseNo,
    });
    return this.repository.save(doctor);
  }

  async remove(id: string): Promise<{ action: string }> {
    const doctor = await this.findById(id);
    await this.repository.remove(doctor);
    return { action: 'deleted' };
  }

  private async ensureUniqueLicenseNo(licenseNo: string, excludeId?: string): Promise<void> {
    const existingDoctor = await this.repository.findByLicenseNo(licenseNo);
    if (existingDoctor && existingDoctor.id !== excludeId) {
      throw new ConflictException('Số giấy phép hành nghề đã tồn tại');
    }
  }

  private async ensureUniqueStaffId(staffId: string, excludeId?: string): Promise<void> {
    const existingDoctor = await this.repository.findByStaffId(staffId);
    if (existingDoctor && existingDoctor.id !== excludeId) {
      throw new ConflictException('Tài khoản nhân viên này đã có hồ sơ bác sĩ');
    }
  }
}
