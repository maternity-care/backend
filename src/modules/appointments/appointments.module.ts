import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../../database/entities/appointment.entity';
import { FacilityService } from '../facility-services/entities/facility-service.entity';
import { DoctorShift } from '../shifts/entities/shift.entity';
import { SchedulesModule } from '../schedules/schedules.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, FacilityService, DoctorShift]), SchedulesModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
