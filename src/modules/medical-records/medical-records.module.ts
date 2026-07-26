import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../../database/entities/appointment.entity';
import { MedicalFile } from '../../database/entities/medical-file.entity';
import { MedicalRecord } from './entities/medical-record.entity';
import { MEDICAL_RECORD_REPOSITORY } from './interface/medical-record-repository.interface';
import { MEDICAL_RECORD_SERVICE } from './interface/medical-record-service.inteface';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordRepository } from './repositories/medical-record.repository';

@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecord, MedicalFile, Appointment])],
  controllers: [MedicalRecordsController],
  providers: [
    MedicalRecordsService,
    MedicalRecordRepository,
    { provide: MEDICAL_RECORD_SERVICE, useExisting: MedicalRecordsService },
    { provide: MEDICAL_RECORD_REPOSITORY, useExisting: MedicalRecordRepository },
  ],
  exports: [MedicalRecordsService, MEDICAL_RECORD_SERVICE],
})
export class MedicalRecordsModule {}
