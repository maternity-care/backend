import { EMAIL_DOMAIN } from './../../users/users.enum';
import { DeepPartial, Repository } from 'typeorm';
import { Staff } from '../entities/staff.entity';
import { IStaffProfileRepository } from '../interfaces/staff-profile-repository.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { parseSearch } from '../../../common/helpers/search-builder';
import { SearchUserDto } from '../../users/dto/request/search-user.dto';
import { SearchUserResponseDto } from '../../users/dto/response/search-user-response.dto';

export class StaffProfileRepository implements IStaffProfileRepository {
  constructor(
    @InjectRepository(Staff)
    private readonly repository: Repository<Staff>,
  ) {}

  async create(data: DeepPartial<Staff>): Promise<Staff> {
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

  async save(staffProfile: Staff): Promise<Staff> {
    return this.repository.save(staffProfile);
  }

  findAll(): Promise<Staff[]> {
    return this.repository.find({
      relations: { roles: { permissions: true } },
      order: { id: 'ASC' },
    });
  }

  async searchStaffs(query: SearchUserDto): Promise<SearchUserResponseDto> {
    const offset = Number(((Number(query?.page) || 1) - 1) * (query?.limit || 10)) || 0;
    const limit = Number(query.limit) || 10;
    const qb = this.repository
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission');

    const filters = parseSearch(query.search);
    const keyword = filters.find((filter) => filter.field === 'keyword')?.values[0];
    if (keyword) {
      qb.andWhere(
        '(staff.name LIKE :keyword OR staff.email LIKE :keyword OR staff.personalEmail LIKE :keyword OR staff.phone LIKE :keyword OR staff.employeeCode LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    const role = filters.find((filter) => filter.field === 'role')?.values[0];
    if (role) {
      qb.andWhere('role.name = :role', { role });
    }

    const status = filters.find((filter) => filter.field === 'status')?.values[0] ?? query.status;
    if (status) {
      qb.andWhere('staff.status = :status', { status });
    }

    if (query.name) {
      qb.andWhere('staff.name LIKE :name', { name: `%${query.name}%` });
    }

    if (query.email) {
      qb.andWhere('(staff.email LIKE :email OR staff.personalEmail LIKE :email)', {
        email: `%${query.email}%`,
      });
    }

    if (query.phone) {
      qb.andWhere('staff.phone LIKE :phone', { phone: `%${query.phone}%` });
    }

    if (query.roleId) {
      qb.andWhere('role.id = :roleId', { roleId: query.roleId });
    }

    qb.orderBy('staff.id', query.sort === 'DESC' ? 'DESC' : 'ASC');

    const [users, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return {
      users: users as never,
      total,
    };
  }

  async findById(id: string): Promise<Staff | null> {
    return this.repository.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });
  }

  async findByEmail(email: string): Promise<Staff | null> {
    return this.repository.findOne({
      where: { email },
      relations: { roles: { permissions: true } },
    });
  }

  async findByEmailWithPassword(email: string): Promise<Staff | null> {
    return this.repository
      .createQueryBuilder('staff')
      .addSelect('staff.password')
      .leftJoinAndSelect('staff.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('staff.email = :email', { email })
      .getOne();
  }

  async findByEmployeeCode(employeeCode: string): Promise<Staff | null> {
    return this.repository.findOne({
      where: { employeeCode },
      relations: { roles: { permissions: true } },
    });
  }

  async findByPersonalEmail(email: string): Promise<Staff | null> {
    return this.repository.findOne({
      where: { personalEmail: email },
      relations: { roles: { permissions: true } },
    });
  }

  async updateStaffProfile(id: string, data: DeepPartial<Staff>): Promise<Staff | null> {
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
  FROM staffs
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
  FROM staffs
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
