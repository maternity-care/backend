import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IRedisCacheService, REDIS_CACHE_SERVICE } from '../../common/cache/redis-cache.interface';
import { UpdateSettingDto, UpsertSettingDto } from './dto/update-setting.dto';
import { Setting } from './entities/setting.entity';
import {
  ISettingsRepository,
  SETTINGS_REPOSITORY,
} from './interfaces/settings-repository.interface';

@Injectable()
export class SettingsService {
  private readonly publicCacheKey = 'settings:public';

  constructor(
    @Inject(SETTINGS_REPOSITORY)
    private readonly settingsRepository: ISettingsRepository,
    @Inject(REDIS_CACHE_SERVICE)
    private readonly cacheService: IRedisCacheService,
  ) {}

  async findPublic(): Promise<Record<string, unknown>> {
    const cachedSettings = await this.cacheService.get<Record<string, unknown>>(
      this.publicCacheKey,
    );
    if (cachedSettings) {
      return cachedSettings;
    }

    const settings = await this.settingsRepository.findPublic();
    const mappedSettings = this.toKeyValue(settings);
    await this.cacheService.set(this.publicCacheKey, mappedSettings, 300);
    return mappedSettings;
  }

  findAll(): Promise<Setting[]> {
    return this.settingsRepository.findAll();
  }

  async findByKey(key: string): Promise<Setting> {
    const setting = await this.settingsRepository.findByKey(key);
    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    return setting;
  }

  async upsert(dto: UpsertSettingDto): Promise<Setting> {
    const existing = await this.settingsRepository.findByKey(dto.key);
    const setting =
      existing ??
      this.settingsRepository.create({
        key: dto.key,
      });

    setting.value = dto.value;
    setting.group = dto.group ?? setting.group ?? 'general';
    setting.isPublic = dto.isPublic === undefined ? (setting.isPublic ?? 1) : dto.isPublic ? 1 : 0;

    const savedSetting = await this.settingsRepository.save(setting);
    await this.clearCache();
    return savedSetting;
  }

  async update(key: string, dto: UpdateSettingDto): Promise<Setting> {
    const setting = await this.findByKey(key);

    setting.value = dto.value;
    setting.group = dto.group ?? setting.group;
    setting.isPublic = dto.isPublic === undefined ? setting.isPublic : dto.isPublic ? 1 : 0;

    const savedSetting = await this.settingsRepository.save(setting);
    await this.clearCache();
    return savedSetting;
  }

  private toKeyValue(settings: Setting[]): Record<string, unknown> {
    return settings.reduce<Record<string, unknown>>((result, setting) => {
      result[setting.key] = setting.value;
      return result;
    }, {});
  }

  private async clearCache(): Promise<void> {
    await this.cacheService.del(this.publicCacheKey);
  }
}
