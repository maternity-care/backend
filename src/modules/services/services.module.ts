import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceTypesModule } from '../service-types/service-types.module';
import { Service } from './entities/service.entity';
import { SERVICES_REPOSITORY } from './interfaces/services-repository.interface';
import { ServicesController } from './services.controller';
import { ServicesRepository } from './repositories/services.repository';
import { ServicesService } from './services.service';

@Module({
  imports: [TypeOrmModule.forFeature([Service]), ServiceTypesModule],
  controllers: [ServicesController],
  providers: [
    ServicesService,
    { provide: SERVICES_REPOSITORY, useClass: ServicesRepository },
  ],
  exports: [ServicesService, SERVICES_REPOSITORY],
})
export class ServicesModule {}
