import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from '../services/entities/service.entity';
import { ServiceType } from './entities/service-type.entity';
import { SERVICE_TYPES_REPOSITORY } from './interfaces/service-types-repository.interface';
import { ServiceTypesController } from './service-types.controller';
import { ServiceTypesService } from './service-types.service';
import { ServiceTypesRepository } from './repositories/service-types.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceType, Service])],
  controllers: [ServiceTypesController],
  providers: [
    ServiceTypesService,
    { provide: SERVICE_TYPES_REPOSITORY, useClass: ServiceTypesRepository },
  ],
  exports: [ServiceTypesService, SERVICE_TYPES_REPOSITORY],
})
export class ServiceTypesModule {}
