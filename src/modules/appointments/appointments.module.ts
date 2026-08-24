import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacilityService } from '../facility-services/entities/facility-service.entity';
import { DoctorShift } from '../shifts/entities/shift.entity';
import { SchedulesModule } from '../schedules/schedules.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AppointmentsController } from './appointments.controller';
import { ManagementAppointmentsController } from './management-appointments.controller';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';
import { AppointmentServiceItem } from './entities/appointment-service-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, AppointmentServiceItem, FacilityService, DoctorShift]),
    SchedulesModule,
    NotificationsModule,
    RealtimeModule,
  ],
  controllers: [AppointmentsController, ManagementAppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
