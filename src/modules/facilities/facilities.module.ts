import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Facility } from './entities/facilities.entity';
import { FacilityStaff } from './entities/facility-staff.entity';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { FacilitiesRepository } from './repositories/facilities.repository';
import { FACILITIES_REPOSITORY } from './interfaces/facility-repository.interface';
import {PublicFacilitiesController} from './public.facilities.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Facility, FacilityStaff])],
  controllers: [FacilitiesController, PublicFacilitiesController],
  providers: [
    FacilitiesService,
    { provide: FACILITIES_REPOSITORY, useClass: FacilitiesRepository },
  ],
  exports: [FacilitiesService, FACILITIES_REPOSITORY],
})
export class FacilitiesModule {}
