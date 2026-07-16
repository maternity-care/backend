import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorShift } from './entities/doctor-shifts.entity';
import { DoctorShiftChangeLog } from './entities/doctor-shift-change-logs.entity';
import { ShiftDisruption } from './entities/shift-disruptions.entity';
import { AppointmentDisruptionItem } from './entities/appointment-disruption-items.entity';
import { FacilitiesModule } from '../facilities/facilities.module';
import { RoomsModule } from '../rooms/rooms.module';
import { DoctorShiftsController } from './doctor-shifts.controller';
import { DoctorShiftsService } from './doctor-shifts.service';
import { DOCTOR_SHIFTS_REPOSITORY } from './interfaces/doctor-shifts-repository.interface';
import { DoctorShiftsRepository } from './repositories/doctor-shifts.repository';
import { DoctorShiftsValidator } from './validators/doctor-shifts.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DoctorShift,
      DoctorShiftChangeLog,
      ShiftDisruption,
      AppointmentDisruptionItem,
    ]),
    FacilitiesModule,
    RoomsModule,
  ],
  controllers: [DoctorShiftsController],
  providers: [
    DoctorShiftsService,
    DoctorShiftsValidator,
    { provide: DOCTOR_SHIFTS_REPOSITORY, useClass: DoctorShiftsRepository },
  ],
  exports: [DoctorShiftsService, DOCTOR_SHIFTS_REPOSITORY],
})
export class DoctorShiftsModule {}
