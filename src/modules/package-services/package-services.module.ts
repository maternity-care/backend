import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackageServiceFacility } from '../../database/entities/package-service-facilities.entity';
import { PackageService } from '../../database/entities/package-services.entity';
import { FacilitiesModule } from '../facilities/facilities.module';
import { MaternityPackagesModule } from '../maternity-packages/maternity-packages.module';
import { ServicesModule } from '../services/services.module';
import { PACKAGE_SERVICES_REPOSITORY } from './interfaces/package-services-repository.interface';
import { PackageServicesController } from './package-services.controller';
import { PackageServicesService } from './package-services.service';
import { PackageServicesRepository } from './repositories/package-services.repository';
import { PublicPackageServicesController } from './public-package-services.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PackageService, PackageServiceFacility]),
    MaternityPackagesModule,
    ServicesModule,
    FacilitiesModule,
  ],
  controllers: [PackageServicesController, PublicPackageServicesController],
  providers: [
    PackageServicesService,
    { provide: PACKAGE_SERVICES_REPOSITORY, useClass: PackageServicesRepository },
  ],
  exports: [PackageServicesService, PACKAGE_SERVICES_REPOSITORY],
})
export class PackageServicesModule {}
