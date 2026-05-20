import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { ManagementSettingsController } from './management-settings.controller';
import { SETTINGS_REPOSITORY } from './interfaces/settings-repository.interface';
import { SettingsRepository } from './repositories/settings.repository';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [SettingsController, ManagementSettingsController],
  providers: [
    SettingsService,
    {
      provide: SETTINGS_REPOSITORY,
      useClass: SettingsRepository,
    },
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
