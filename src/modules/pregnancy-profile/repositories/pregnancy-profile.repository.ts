import { NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { PregnancyProfile } from '../entities/pregnancy-profile.entity';
import { IPregnancyProfileRepository } from '../interfaces/pregnancy-profile-repository.interface';
import { SearchProfileQueryDto } from '../dto/request/search-pregnancy-profiles.dto';
import { User } from 'src/modules/users/entities/user.entity';
import { RESPONSE_MESSAGES } from 'src/common/constants/response-message.constant';
import { PregnancyProfileStatus } from 'src/common/constants/status.enum';

export class PregnancyProfileRepository implements IPregnancyProfileRepository {
  constructor(
    @InjectRepository(PregnancyProfile)
    private readonly repository: Repository<PregnancyProfile>,
  ) {}

  create(data: DeepPartial<PregnancyProfile>): PregnancyProfile {
    return this.repository.create(data);
  }

  save(profile: PregnancyProfile): Promise<PregnancyProfile> {
    return this.repository.save(profile);
  }

  async update(id: string, data: DeepPartial<PregnancyProfile>): Promise<PregnancyProfile> {
    const profile = await this.findById(id);
    if (!profile) {
      throw new NotFoundException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_FOUND);
    }

    Object.assign(profile, data);
    return this.repository.save(profile);
  }

  async findById(id: string): Promise<PregnancyProfile | null> {
    const profile = await this.repository.findOne({
      where: { id },
      relations: { user: true, userProfile: true },
    });
    if (!profile) {
      throw new NotFoundException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_FOUND);
    }
    return profile;
  }

  async findByCode(code: string): Promise<PregnancyProfile | null> {
    const profile = await this.repository.findOne({
      where: { code },
      relations: { user: true, userProfile: true },
    });
    if (!profile) {
      throw new NotFoundException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_FOUND);
    }
    return profile;
  }

  async findAll(): Promise<{ data: PregnancyProfile[]; total: number }> {
    const [data, total] = await this.repository.findAndCount({
      relations: { user: true, userProfile: true },
      order: { id: 'DESC' },
    });
    return { data, total };
  }

  async findByPatientId(patientId: string): Promise<PregnancyProfile[]> {
    const profile = await this.repository.find({
      where: { patientId },
      relations: { user: true, userProfile: true },
      order: { id: 'DESC' },
    });
    if (!profile) {
      throw new NotFoundException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_FOUND);
    }
    return profile;
  }

  async softDelete(userId: string, id: string, reason: string): Promise<void> {
    // soft delete
    const profile = await this.findById(id);
    if (!profile) {
      throw new NotFoundException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_FOUND);
    }
    await this.repository.update(
      { id: id },
      { deletedBy: userId, deletedReason: reason, deletedAt: new Date(), status: 'DELETED' },
    );
  }

  async remove(id: string): Promise<void> {
    // hard delete
    const profile = await this.findById(id);
    if (!profile) {
      throw new NotFoundException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_FOUND);
    }
    await this.repository.remove(profile);
  }

  async generatePregnancyCode(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2); // Lấy 2 chữ số cuối của năm hiện tại
    const result = await this.repository.query(
      `
  SELECT COALESCE(
    MAX(
      CAST(
        RIGHT(code, 4)
        AS UNSIGNED
      )
    ),
    0
  ) AS max_number
  FROM pregnancy_profiles
  WHERE code LIKE ?
  `,
      [`PW${year}%`], // dùng prefix là PW là pregnant woman
    );

    // tạo string nextNumber với 4 chữ số, ví dụ: 0001, 0002, 0003, ...
    const nextNumber = (Number(result[0].max_number) + 1).toString().padStart(4, '0');
    return `PW${year}${nextNumber}`;
  }

  async searchProfiles(
    query: SearchProfileQueryDto,
  ): Promise<{ data: PregnancyProfile[]; total: number }> {
    const where: FindOptionsWhere<PregnancyProfile> = {};

    if (query?.code) {
      where.code = query.code;
    }

    if (query?.status) {
      where.status = query.status;
    }

    const userWhere: FindOptionsWhere<User> = {};

    if (query?.name) {
      userWhere.name = query.name;
    }

    if (query?.phone) {
      userWhere.phone = query.phone;
    }

    const [data, total] = await this.repository.findAndCount({
      relations: { user: true, userProfile: true },
      where: {
        ...where,
        user: {
          ...userWhere,
        },
      },
      skip: query.page ? (query.page - 1) * (query.limit ?? 10) : 0,
      take: query.limit ?? 10,
    });
    return { data, total };
  }

  async checkActiveProfileExists(patientId: string): Promise<boolean> {
    const activeProfile = await this.repository.exists({
      where: { patientId, status: PregnancyProfileStatus.ACTIVE },
    });
    return !!activeProfile;
  }
}
