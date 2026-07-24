import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { validate } from './config/validation';
import { Permission } from './modules/permissions/entities/permission.entity';
import { Role } from './modules/roles/entities/role.entity';
import { Doctor } from './modules/doctors/entities/doctor.entity';
import { Staff } from './modules/staffs/entities/staff.entity';
import { Facility } from './modules/facilities/entities/facility.entity';
import { Room } from './modules/rooms/entities/room.entity';
import { RoomType } from './database/entities/room-type.entity';
import { Shift } from './modules/doctor-shifts/entities/shift.entity';
import { DoctorShiftChangeLog } from './modules/doctor-shifts/entities/doctor-shift-change-log.entity';
import { ShiftDisruption } from './modules/doctor-shifts/entities/shift-disruption.entity';
import { AppointmentDisruptionItem } from './modules/doctor-shifts/entities/appointment-disruption-item.entity';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { DoctorShiftsModule } from './modules/doctor-shifts/doctor-shifts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validate,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mariadb',
        host: configService.getOrThrow<string>('database.host'),
        port: configService.getOrThrow<number>('database.port'),
        username: configService.getOrThrow<string>('database.username'),
        password: configService.getOrThrow<string>('database.password'),
        database: configService.getOrThrow<string>('database.name'),
        synchronize: false,
        migrationsRun: false,
        logging: configService.get<string>('app.nodeEnv') === 'development',
        entities: [
          Permission,
          Role,
          Doctor,
          Staff,
          Facility,
          Room,
          RoomType,
          Shift,
          DoctorShiftChangeLog,
          ShiftDisruption,
          AppointmentDisruptionItem,
        ],
        autoLoadEntities: true,
        charset: 'utf8mb4_unicode_ci',
      }),
    }),
    FacilitiesModule,
    RoomsModule,
    DoctorShiftsModule,
  ],
})
export class FacilityRoomsAppModule {}
