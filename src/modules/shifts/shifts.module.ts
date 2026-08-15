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
import { PublicShiftsController } from './public-shifts.controller';
import { ShiftSlotsController } from './shift-slots.controller';
import { ShiftsService } from './shifts.service';
import { ShiftSlotsService } from './shift-slots.service';
import { SHIFTS_REPOSITORY } from './interfaces/shifts-repository.interface';
import { ShiftsRepository } from './repositories/shifts.repository';
import { ShiftsValidator } from './validators/shifts.validator';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { ShiftChangeNotifierService } from './shift-change-notifier.service';
import { WeeklyShiftUpdateService } from './weekly-shift-update.service';

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
    NotificationsModule,
    MailModule,
  ],
  controllers: [ShiftsController, PublicShiftsController, ShiftSlotsController],
  providers: [
    ShiftsService,
    ShiftSlotsService,
    ShiftsValidator,
    ShiftChangeNotifierService,
    WeeklyShiftUpdateService,
    { provide: SHIFTS_REPOSITORY, useClass: ShiftsRepository },
  ],
  exports: [ShiftsService, ShiftSlotsService, SHIFTS_REPOSITORY],
})
export class ShiftsModule {}
