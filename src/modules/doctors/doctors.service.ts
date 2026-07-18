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
import { Doctor } from './entities/doctors.entity';
import { UsersService } from '../users/users.service';
import { AdminCreateUserDto } from '../users/dto/request/admin-create-user.dto';
import { User } from '../users/entities/user.entity';
import { USERS_SERVICE } from '../users/interfaces/users-service.interface';

@Injectable()
export class DoctorsService {
  constructor(
    @Inject(DOCTORS_REPOSITORY)
    private readonly repository: IDoctorsRepository,
    @Inject(USERS_SERVICE)
    private readonly usersService: UsersService,
  ) {}

  async create(dto: AdminCreateUserDto, actor: AuthenticatedUser): Promise<User> {
    return this.usersService.createUser(dto, actor);
  }

  async findAll(): Promise<Doctor[]> {
    return this.repository.findAll();
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

    Object.assign(doctor, dto);
    return this.repository.save(doctor);
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
