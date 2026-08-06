import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacilityService } from '../facility-services/entities/facility-service.entity';
import { DoctorShift } from '../shifts/entities/shift.entity';
import { SchedulesModule } from '../schedules/schedules.module';
import { AppointmentsController } from './appointments.controller';
import { ManagementAppointmentsController } from './management-appointments.controller';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, FacilityService, DoctorShift]), SchedulesModule],
  controllers: [AppointmentsController, ManagementAppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
