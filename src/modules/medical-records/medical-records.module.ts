import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalFile } from '../../database/entities/medical-file.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentServiceItem } from '../appointments/entities/appointment-service-item.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingModule } from '../messaging/messaging.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MedicalRecord } from './entities/medical-record.entity';
import { HelperUploadSecretGuard } from './guards/helper-upload-secret.guard';
import { HelperMedicalImagesController } from './helper-medical-images.controller';
import { MEDICAL_RECORD_REPOSITORY } from './interface/medical-record-repository.interface';
import { MEDICAL_RECORD_SERVICE } from './interface/medical-record-service.inteface';
import { MedicalRecordsController } from './manage-medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordRepository } from './repositories/medical-record.repository';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalRecord, MedicalFile, Appointment, AppointmentServiceItem]),
    RealtimeModule,
    UploadsModule,
    NotificationsModule,
    MessagingModule,
  ],
  controllers: [MedicalRecordsController, HelperMedicalImagesController],
  providers: [
    HelperUploadSecretGuard,
    MedicalRecordsService,
    MedicalRecordRepository,
    { provide: MEDICAL_RECORD_SERVICE, useExisting: MedicalRecordsService },
    { provide: MEDICAL_RECORD_REPOSITORY, useExisting: MedicalRecordRepository },
  ],
  exports: [MedicalRecordsService, MEDICAL_RECORD_SERVICE],
})
export class MedicalRecordsModule {}
