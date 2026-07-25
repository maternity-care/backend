import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from './entities/shift.entity';
import { DoctorShiftChangeLog } from './entities/doctor-shift-change-log.entity';
import { ShiftDisruption } from './entities/shift-disruption.entity';
import { AppointmentDisruptionItem } from './entities/appointment-disruption-item.entity';
import { FacilitiesModule } from '../facilities/facilities.module';
import { RoomsModule } from '../rooms/rooms.module';
import { DoctorShiftsController } from './doctor-shifts.controller';
import { DoctorShiftsService } from './doctor-shifts.service';
import { DOCTOR_SHIFTS_REPOSITORY } from './interfaces/doctor-shifts-repository.interface';
import { DoctorShiftsValidator } from './validators/doctor-shifts.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shift,
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
    { provide: DOCTOR_SHIFTS_REPOSITORY, useValue: Shift },
  ],
  exports: [DoctorShiftsService, DOCTOR_SHIFTS_REPOSITORY],
})
export class DoctorShiftsModule {}
