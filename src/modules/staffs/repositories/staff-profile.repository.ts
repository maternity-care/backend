import { DeepPartial, Repository } from 'typeorm';
import { StaffProfile } from '../entities/staff-profiles.entity';
import { IStaffProfileRepository } from '../interfaces/staff-profile-repository.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EMAIL_DOMAIN } from 'src/modules/users/users.enum';

export class StaffProfileRepository implements IStaffProfileRepository {
  constructor(
    @InjectRepository(StaffProfile)
    private readonly repository: Repository<StaffProfile>,
  ) {}

  async create(data: DeepPartial<StaffProfile>): Promise<StaffProfile> {
    const isExistEmail = await this.repository.findOne({
      where: { personalEmail: data.personalEmail },
    });
    if (isExistEmail) {
      throw new ConflictException(
        'Email cá nhân đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.',
      );
    }
    const staffProfile = this.repository.create(data);
    const savedStaffProfile = await this.repository.save(staffProfile);

    return savedStaffProfile;
  }

  async save(staffProfile: StaffProfile): Promise<StaffProfile> {
    return this.repository.save(staffProfile);
  }

  findAll(): Promise<StaffProfile[]> {
    return this.repository.find({
      relations: {
        user: { roles: { permissions: true }, permissionOverrides: { permission: true } },
      },
      order: { id: 'ASC' },
    });
  }

  async findById(id: string): Promise<StaffProfile | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        user: { roles: { permissions: true }, permissionOverrides: { permission: true } },
      },
    });
  }

  async findByUserId(userId: string): Promise<StaffProfile | null> {
    return this.repository.findOne({
      where: { userId },
      relations: {
        user: { roles: { permissions: true }, permissionOverrides: { permission: true } },
      },
    });
  }

  async findByEmployeeCode(employeeCode: string): Promise<StaffProfile | null> {
    return this.repository.findOne({
      where: { employeeCode },
      relations: {
        user: { roles: { permissions: true }, permissionOverrides: { permission: true } },
      },
    });
  }

  async findByPersonalEmail(email: string): Promise<StaffProfile | null> {
    return this.repository.findOne({
      where: { personalEmail: email },
      relations: {
        user: { roles: { permissions: true }, permissionOverrides: { permission: true } },
      },
    });
  }

  async updateStaffProfile(
    id: string,
    data: DeepPartial<StaffProfile>,
  ): Promise<StaffProfile | null> {
    const staffProfile = await this.repository.findOne({ where: { id } });
    if (!staffProfile) {
      throw new NotFoundException(`Không tìm thấy hồ sơ nhân viên với ID: ${id}`);
    }
    if (data?.personalEmail) {
      const isExistEmail = await this.repository.findOne({
        where: { personalEmail: data.personalEmail },
      });
      if (isExistEmail && isExistEmail.id !== id) {
        throw new ConflictException(
          'Email cá nhân đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.',
        );
      }
    }
    return this.repository.save({ ...staffProfile, ...data });
  }

  async generateStaffEmailFromName(name: string): Promise<string> {
    const basePrefix = this.buildEmailPrefixFromName(name);

    const result = await this.repository.query(
      `
  SELECT COALESCE(
    MAX(
      CAST(
        REPLACE(
          SUBSTRING_INDEX(email, '@', 1),
          ?,
          ''
        ) AS UNSIGNED
      )
    ),
    0
  ) AS max_number
  FROM users
  WHERE email REGEXP ?
  `,
      [basePrefix, `^${basePrefix}[0-9]+@${EMAIL_DOMAIN.replace(/\./g, '\\.')}$`],
    );

    const nextNumber = Number(result[0].max_number) + 1;

    return `${basePrefix}${nextNumber}@${EMAIL_DOMAIN}`;
  }

  private buildEmailPrefixFromName(name: string): string {
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z\s]/g, ' ')
      .trim()
      .toLowerCase();

    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      throw new Error('Tên người dùng không hợp lệ. Tên phải chứa ít nhất một ký tự chữ cái.');
    }

    const lastPart = parts[parts.length - 1];
    const prefixParts = parts.slice(0, -1);
    const initials = prefixParts.map((part) => part[0]).join('');

    return `${lastPart}${initials}`.replace(/[^a-z0-9]/g, '');
  }

  generateStaffPassword(): string {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  }

  async generateStaffEmployeeCode(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2); // Lấy 2 chữ số cuối của năm hiện tại
    const result = await this.repository.query(
      `
  SELECT COALESCE(
    MAX(
      CAST(
        RIGHT(employee_code, 4)
        AS UNSIGNED
      )
    ),
    0
  ) AS max_number
  FROM staff_profiles
  WHERE employee_code LIKE ?
  `,
      [`__${year}%`],
    );

    // tạo string nextNumber với 4 chữ số, ví dụ: 0001, 0002, 0003, ...
    const nextNumber = (Number(result[0].max_number) + 1).toString().padStart(4, '0');
    return `${year}${nextNumber}`;
  }

  async checkPersonalEmailExists(email: string): Promise<boolean> {
    const staffProfile = await this.repository.findOne({ where: { personalEmail: email } });
    return !!staffProfile;
  }
}
