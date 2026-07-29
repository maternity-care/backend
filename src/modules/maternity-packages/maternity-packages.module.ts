import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaternityPackage } from './entities/maternity-package.entity';
import { FacilitiesModule } from '../facilities/facilities.module';
import { MATERNITY_PACKAGES_REPOSITORY } from './interfaces/maternity-packages-repository.interface';
import { MaternityPackagesController } from './maternity-packages.controller';
import { MaternityPackagesRepository } from './repositories/maternity-packages.repository';
import { MaternityPackagesService } from './maternity-packages.service';
import { PublicFacilityMaternityPackagesController } from './public-facility-maternity-packages.controller';
import { PublicMaternityPackagesController } from './public-maternity-packages.controller';
import { PackageItem } from '../package-services/entities/package-item.entity';
import { FacilityServicesModule } from '../facility-services/facility-services.module';
import { PackageStage } from './entities/package-stage.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaternityPackage, PackageStage, PackageItem]),
    FacilitiesModule,
    FacilityServicesModule,
  ],
  controllers: [
    MaternityPackagesController,
    PublicMaternityPackagesController,
    PublicFacilityMaternityPackagesController,
  ],
  providers: [
    MaternityPackagesService,
    { provide: MATERNITY_PACKAGES_REPOSITORY, useClass: MaternityPackagesRepository },
  ],
  exports: [MaternityPackagesService, MATERNITY_PACKAGES_REPOSITORY],
})
export class MaternityPackagesModule {}
