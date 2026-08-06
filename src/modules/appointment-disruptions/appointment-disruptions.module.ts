import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsModule } from '../appointments/appointments.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AppointmentDisruptionItem } from '../shifts/entities/appointment-disruption-item.entity';
import { ShiftDisruption } from '../shifts/entities/shift-disruption.entity';
import { AppointmentDisruptionsController } from './appointment-disruptions.controller';
import { AppointmentDisruptionsService } from './appointment-disruptions.service';
import { ManagementAppointmentDisruptionsController } from './management-appointment-disruptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppointmentDisruptionItem, ShiftDisruption]),
    AppointmentsModule,
    NotificationsModule,
    MailModule,
  ],
  controllers: [AppointmentDisruptionsController, ManagementAppointmentDisruptionsController],
  providers: [AppointmentDisruptionsService],
  exports: [AppointmentDisruptionsService],
})
export class AppointmentDisruptionsModule {}
