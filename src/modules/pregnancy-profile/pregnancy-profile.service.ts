import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePregnancyProfileDto } from './dto/request/create-pregnancy-profile.dto';
import { UpdatePregnancyProfileDto } from './dto/request/update-pregnancy-profile.dto';
import { PregnancyProfile } from './entities/pregnancy-profiles.entity';
import {
  IPregnancyProfileRepository,
  PREGNANCY_PROFILE_REPOSITORY,
} from './interfaces/pregnancy-profile-repository.interface';

@Injectable()
export class PregnancyProfileService {
  constructor(
    @Inject(PREGNANCY_PROFILE_REPOSITORY)
    private readonly pregnancyProfileRepository: IPregnancyProfileRepository,
  ) {}

  async create(
    patientId: string,
    dto: CreatePregnancyProfileDto,
    createdBy?: string,
  ): Promise<PregnancyProfile> {
    const existing = await this.pregnancyProfileRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException('Mã hồ sơ thai sản đã tồn tại');
    }

    const profile = this.pregnancyProfileRepository.create({
      patientId,
      code: dto.code,
      lastMenstrualPeriod: dto.lastMenstrualPeriod,
      expectedDueDate: dto.expectedDueDate,
      gravida: dto.gravida,
      paraFullTerm: dto.paraFullTerm ?? 0,
      paraPremature: dto.paraPremature ?? 0,
      paraAbortion: dto.paraAbortion ?? 0,
      paraLivingChildren: dto.paraLivingChildren ?? 0,
      riskLevel: dto.riskLevel,
      status: dto.status,
      notes: dto.notes,
      createdBy,
    });

    return this.pregnancyProfileRepository.save(profile);
  }

  async findMyProfiles(patientId: string): Promise<PregnancyProfile[]> {
    return this.pregnancyProfileRepository.findByPatientId(patientId);
  }

  async findById(id: string): Promise<PregnancyProfile> {
    const profile = await this.pregnancyProfileRepository.findById(id);
    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ thai sản');
    }
    return profile;
  }

  async findByIdForPatient(id: string, patientId: string): Promise<PregnancyProfile> {
    const profile = await this.findById(id);
    if (profile.patientId !== patientId) {
      throw new NotFoundException('Không tìm thấy hồ sơ thai sản của bạn');
    }
    return profile;
  }

  async update(id: string, dto: UpdatePregnancyProfileDto): Promise<PregnancyProfile> {
    const profile = await this.findById(id);
    if (dto.code && dto.code !== profile.code) {
      const existing = await this.pregnancyProfileRepository.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new ConflictException('Mã hồ sơ thai sản đã tồn tại');
      }
    }
    Object.assign(profile, dto);
    return this.pregnancyProfileRepository.save(profile);
  }

  async updateByPatient(
    id: string,
    patientId: string,
    dto: UpdatePregnancyProfileDto,
  ): Promise<PregnancyProfile> {
    const profile = await this.findByIdForPatient(id, patientId);
    if (dto.code && dto.code !== profile.code) {
      const existing = await this.pregnancyProfileRepository.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new ConflictException('Mã hồ sơ thai sản đã tồn tại');
      }
    }
    Object.assign(profile, dto);
    return this.pregnancyProfileRepository.save(profile);
  }
}
