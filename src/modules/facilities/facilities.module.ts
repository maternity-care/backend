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
import { AppointmentDisruptionsModule } from '../appointment-disruptions/appointment-disruptions.module';
import { FACILITY_OPERATING_HOURS_REPOSITORY } from './interfaces/facility-operating-hours-repository.interface';
import { FacilityOperatingHoursRepository } from './repositories/facility-operating-hours.repository';
import { FACILITY_CLOSURE_DAYS_REPOSITORY } from './interfaces/facility-closure-days-repository.interface';
import { FacilityClosureDaysRepository } from './repositories/facility-closure-days.repository';
import { FacilityImpactRepository } from './repositories/facility-impact.repository';
import { FacilityOperatingHoursService } from './facility-operating-hours.service';
import { FacilityClosureDaysService } from './facility-closure-days.service';

@Module({
  imports: [TypeOrmModule.forFeature([Facility, FacilityOperatingHour, FacilityClosureDay]), AppointmentDisruptionsModule],
  controllers: [FacilitiesController, PublicFacilitiesController],
  providers: [
    FacilitiesService,
    FacilityImpactRepository,
    FacilityOperatingHoursService,
    FacilityClosureDaysService,
    { provide: FACILITIES_REPOSITORY, useClass: FacilitiesRepository },
    { provide: FACILITY_OPERATING_HOURS_REPOSITORY, useClass: FacilityOperatingHoursRepository },
    { provide: FACILITY_CLOSURE_DAYS_REPOSITORY, useClass: FacilityClosureDaysRepository },
  ],
  exports: [
    FacilitiesService, 
    FacilityImpactRepository,
    FacilityOperatingHoursService,
    FacilityClosureDaysService,
    FACILITIES_REPOSITORY, 
    FACILITY_OPERATING_HOURS_REPOSITORY,
    FACILITY_CLOSURE_DAYS_REPOSITORY
  ],
})
export class FacilitiesModule {}
