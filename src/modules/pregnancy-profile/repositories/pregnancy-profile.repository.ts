import { NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { PregnancyProfile } from '../entities/pregnancy-profiles.entity';
import { IPregnancyProfileRepository } from '../interfaces/pregnancy-profile-repository.interface';

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
      throw new NotFoundException('Không tìm thấy hồ sơ thai sản');
    }

    Object.assign(profile, data);
    return this.repository.save(profile);
  }

  async findById(id: string): Promise<PregnancyProfile | null> {
    return this.repository.findOne({
      where: { id },
      relations: { user: true, userProfile: true },
    });
  }

  async findByCode(code: string): Promise<PregnancyProfile | null> {
    return this.repository.findOne({
      where: { code },
      relations: { user: true, userProfile: true },
    });
  }

  async findAll(): Promise<{ data: PregnancyProfile[]; total: number }> {
    const [data, total] = await this.repository.findAndCount({
      relations: { user: true, userProfile: true },
      order: { id: 'DESC' },
    });
    return { data, total };
  }

  async findByPatientId(patientId: string): Promise<PregnancyProfile[]> {
    return this.repository.find({
      where: { patientId },
      relations: { user: true, userProfile: true },
      order: { id: 'DESC' },
    });
  }

  async softDelete(userId: string, pregnancyId: string, reason: string): Promise<void> {
    // soft delete
    const profile = await this.findById(pregnancyId);
    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ thai sản');
    }
    await this.repository.update(
      { id: pregnancyId },
      { deletedBy: userId, deletedReason: reason, deletedAt: new Date() },
    );
  }

  async remove(id: string): Promise<void> {
    // hard delete
    const profile = await this.findById(id);
    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ thai sản');
    }
    await this.repository.remove(profile);
  }
}
