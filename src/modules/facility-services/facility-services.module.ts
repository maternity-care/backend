import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacilitiesModule } from '../facilities/facilities.module';
import { ServicesModule } from '../services/services.module';
import { FacilityService } from './entities/facility-services.entity';
import { FacilityServicesController } from './facility-services.controller';
import { FacilityServicesService } from './facility-services.service';
import { PublicFacilityServicesController } from './public-facility-services.controller';
import { FACILITY_SERVICES_REPOSITORY } from './interfaces/facility-services-repository.interface';
import { FacilityServicesRepository } from './repositories/facility-services.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([FacilityService]),
    FacilitiesModule,
    ServicesModule,
  ],
  controllers: [FacilityServicesController, PublicFacilityServicesController],
  providers: [
    FacilityServicesService,
    { provide: FACILITY_SERVICES_REPOSITORY, useClass: FacilityServicesRepository },
  ],
  exports: [FacilityServicesService, FACILITY_SERVICES_REPOSITORY],
})
export class FacilityServicesModule {}
