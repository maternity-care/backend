import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PregnancyProfile } from './entities/pregnancy-profile.entity';
import { PregnancyProfileController } from './pregnancy-profile.controller';
import { ManagementPregnancyProfileController } from './management-pregnancy-profile.controller';
import { PregnancyProfileService } from './pregnancy-profile.service';
import { PREGNANCY_PROFILE_REPOSITORY } from './interfaces/pregnancy-profile-repository.interface';
import { PregnancyProfileRepository } from './repositories/pregnancy-profile.repository';
import { JobsModule } from '../jobs/jobs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([PregnancyProfile]), JobsModule, NotificationsModule],
  controllers: [PregnancyProfileController, ManagementPregnancyProfileController],
  providers: [
    PregnancyProfileService,
    PregnancyProfileRepository,
    { provide: PREGNANCY_PROFILE_REPOSITORY, useExisting: PregnancyProfileRepository },
  ],
  exports: [PregnancyProfileService],
})
export class PregnancyProfileModule {}
