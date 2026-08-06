import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorShift } from './entities/shift.entity';
import { DoctorShiftChangeLog } from './entities/doctor-shift-change-log.entity';
import { ShiftDisruption } from './entities/shift-disruption.entity';
import { AppointmentDisruptionItem } from './entities/appointment-disruption-item.entity';
import { ShiftSlot } from '../../database/entities/shift-slot.entity';
import { FacilitiesModule } from '../facilities/facilities.module';
import { RoomsModule } from '../rooms/rooms.module';
import { AppointmentDisruptionsModule } from '../appointment-disruptions/appointment-disruptions.module';
import { ShiftsController } from './shifts.controller';
import { ShiftSlotsController } from './shift-slots.controller';
import { ShiftsService } from './shifts.service';
import { ShiftSlotsService } from './shift-slots.service';
import { SHIFTS_REPOSITORY } from './interfaces/shifts-repository.interface';
import { ShiftsRepository } from './repositories/shifts.repository';
import { ShiftsValidator } from './validators/shifts.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DoctorShift,
      DoctorShiftChangeLog,
      ShiftDisruption,
      AppointmentDisruptionItem,
      ShiftSlot,
    ]),
    FacilitiesModule,
    RoomsModule,
    AppointmentDisruptionsModule,
  ],
  controllers: [ShiftsController, ShiftSlotsController],
  providers: [
    ShiftsService,
    ShiftSlotsService,
    ShiftsValidator,
    { provide: SHIFTS_REPOSITORY, useClass: ShiftsRepository },
  ],
  exports: [ShiftsService, ShiftSlotsService, SHIFTS_REPOSITORY],
})
export class ShiftsModule {}
