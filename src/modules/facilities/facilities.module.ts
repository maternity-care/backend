import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Facility } from './entities/facility.entity';
import { FacilityOperatingHour } from './entities/facility-operating-hour.entity';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { FacilitiesRepository } from './repositories/facilities.repository';
import { FACILITIES_REPOSITORY } from './interfaces/facility-repository.interface';
import { PublicFacilitiesController } from './public.facilities.controller';
import { AppointmentDisruptionsModule } from '../appointment-disruptions/appointment-disruptions.module';
import { FACILITY_OPERATING_HOURS_REPOSITORY } from './interfaces/facility-operating-hours-repository.interface';
import { FacilityOperatingHoursRepository } from './repositories/facility-operating-hours.repository';
import { FacilityImpactRepository } from './repositories/facility-impact.repository';
import { FacilityOperatingHoursService } from './facility-operating-hours.service';

@Module({
  imports: [TypeOrmModule.forFeature([Facility, FacilityOperatingHour]), AppointmentDisruptionsModule],
  controllers: [FacilitiesController, PublicFacilitiesController],
  providers: [
    FacilitiesService,
    FacilityImpactRepository,
    FacilityOperatingHoursService,
    { provide: FACILITIES_REPOSITORY, useClass: FacilitiesRepository },
    { provide: FACILITY_OPERATING_HOURS_REPOSITORY, useClass: FacilityOperatingHoursRepository },
  ],
  exports: [
    FacilitiesService, 
    FacilityImpactRepository,
    FacilityOperatingHoursService,
    FACILITIES_REPOSITORY, 
    FACILITY_OPERATING_HOURS_REPOSITORY,
  ],
})
export class FacilitiesModule {}
