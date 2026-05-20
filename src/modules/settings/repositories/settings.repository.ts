import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Setting } from '../entities/setting.entity';
import { ISettingsRepository } from '../interfaces/settings-repository.interface';

@Injectable()
export class SettingsRepository implements ISettingsRepository {
  constructor(
    @InjectRepository(Setting)
    private readonly repository: Repository<Setting>,
  ) {}

  create(data: DeepPartial<Setting>): Setting {
    return this.repository.create(data);
  }

  save(setting: Setting): Promise<Setting> {
    return this.repository.save(setting);
  }

  findAll(): Promise<Setting[]> {
    return this.repository.find({ order: { group: 'ASC', key: 'ASC' } });
  }

  findPublic(): Promise<Setting[]> {
    return this.repository.find({
      where: { isPublic: 1 },
      order: { group: 'ASC', key: 'ASC' },
    });
  }

  findByKey(key: string): Promise<Setting | null> {
    return this.repository.findOne({ where: { key } });
  }
}
