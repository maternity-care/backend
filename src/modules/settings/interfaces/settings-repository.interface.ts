import { DeepPartial } from 'typeorm';
import { Setting } from '../entities/setting.entity';

export const SETTINGS_REPOSITORY = Symbol('SETTINGS_REPOSITORY');

export interface ISettingsRepository {
  create(data: DeepPartial<Setting>): Setting;
  save(setting: Setting): Promise<Setting>;
  findAll(): Promise<Setting[]>;
  findPublic(): Promise<Setting[]>;
  findByKey(key: string): Promise<Setting | null>;
}
