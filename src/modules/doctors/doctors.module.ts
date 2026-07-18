import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from './entities/doctors.entity';
import { DoctorsController } from './doctors.controller';
import { ManagementDoctorsController } from './management-doctors.controller';
import { DoctorsService } from './doctors.service';
import { DOCTORS_REPOSITORY } from './interfaces/doctors-repository.interface';
import { DoctorsRepository } from './repositories/doctors.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor]), UsersModule],
  controllers: [DoctorsController, ManagementDoctorsController],
  providers: [DoctorsService, { provide: DOCTORS_REPOSITORY, useClass: DoctorsRepository }],
  exports: [DoctorsService],
})
export class DoctorsModule {}
