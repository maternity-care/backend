import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacilityClosureDay } from './entities/facility-closure-day.entity';
import { Facility } from './entities/facility.entity';
import { FacilityOperatingHour } from './entities/facility-operating-hour.entity';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { FacilitiesRepository } from './repositories/facilities.repository';
import { FACILITIES_REPOSITORY } from './interfaces/facility-repository.interface';
import { PublicFacilitiesController } from './public.facilities.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Facility, FacilityOperatingHour, FacilityClosureDay])],
  controllers: [FacilitiesController, PublicFacilitiesController],
  providers: [
    FacilitiesService,
    { provide: FACILITIES_REPOSITORY, useClass: FacilitiesRepository },
  ],
  exports: [FacilitiesService, FACILITIES_REPOSITORY],
})
export class FacilitiesModule {}
