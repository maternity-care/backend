import { PregnancyProfile } from 'src/database/entities';
import { DeepPartial } from 'typeorm';

export const PREGNANCY_PROFILE_REPOSITORY = Symbol('PREGNANCY_PROFILE_REPOSITORY');

export interface IPregnancyProfileRepository {
  create(data: DeepPartial<PregnancyProfile>): PregnancyProfile;
  save(profile: PregnancyProfile): Promise<PregnancyProfile>;
  update(id: string, data: DeepPartial<PregnancyProfile>): Promise<PregnancyProfile>;
  findById(id: string): Promise<PregnancyProfile | null>;
  findByCode(code: string): Promise<PregnancyProfile | null>;
  findAll(): Promise<{ data: PregnancyProfile[]; total: number }>;
  findByPatientId(patientId: string): Promise<PregnancyProfile[]>;
  softDelete(userId: string, pregnancyId: string, reason: string): Promise<void>;
  remove(id: string): Promise<void>;
}
