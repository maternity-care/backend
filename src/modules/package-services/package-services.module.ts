import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaternityPackagesModule } from '../maternity-packages/maternity-packages.module';
import { ServicesModule } from '../services/services.module';
import { PackageItem } from './entities/package-item.entity';
import { PACKAGE_SERVICES_REPOSITORY } from './interfaces/package-services-repository.interface';
import { PackageServicesController } from './package-services.controller';
import { PackageServicesService } from './package-services.service';
import { PackageServicesRepository } from './repositories/package-services.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([PackageItem]),
    MaternityPackagesModule,
    ServicesModule,
  ],
  controllers: [PackageServicesController],
  providers: [
    PackageServicesService,
    { provide: PACKAGE_SERVICES_REPOSITORY, useClass: PackageServicesRepository },
  ],
  exports: [PackageServicesService, PACKAGE_SERVICES_REPOSITORY],
})
export class PackageServicesModule {}
