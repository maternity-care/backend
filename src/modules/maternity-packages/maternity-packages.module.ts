import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaternityPackage } from './entities/maternity-packages.entity';
import { FacilitiesModule } from '../facilities/facilities.module';
import { MATERNITY_PACKAGES_REPOSITORY } from './interfaces/maternity-packages-repository.interface';
import { MaternityPackagesController } from './maternity-packages.controller';
import { MaternityPackagesRepository } from './repositories/maternity-packages.repository';
import { MaternityPackagesService } from './maternity-packages.service';
import { PublicFacilityMaternityPackagesController } from './public-facility-maternity-packages.controller';
import { PublicMaternityPackagesController } from './public-maternity-packages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MaternityPackage]), FacilitiesModule],
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
