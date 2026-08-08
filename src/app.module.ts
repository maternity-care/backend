import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisCacheModule } from './common/cache/redis-cache.module';
import configuration from './config/configuration';
import { validate } from './config/validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { StaffsModule } from './modules/staffs/staffs.module';
import { MapsModule } from './modules/maps/maps.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { ServicesModule } from './modules/services/services.module';
import { ServiceTypesModule } from './modules/service-types/service-types.module';
import { FacilityServicesModule } from './modules/facility-services/facility-services.module';
import { MaternityPackagesModule } from './modules/maternity-packages/maternity-packages.module';
import { PackageServicesModule } from './modules/package-services/package-services.module';
import { PregnancyProfileModule } from './modules/pregnancy-profile/pregnancy-profile.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ForumsModule } from './modules/forums/forums.module';
import { PaymentModule } from './modules/payment/payment.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validate,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('redis.host'),
          port: configService.getOrThrow<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      }),
    }),
    RedisCacheModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    StaffsModule,
    RolesModule,
    PermissionsModule,
    JobsModule,
    UploadsModule,
    SettingsModule,
    FacilitiesModule,
    RoomsModule,
    MapsModule,
    ShiftsModule,
    ServiceTypesModule,
    ServicesModule,
    FacilityServicesModule,
    MaternityPackagesModule,
    PackageServicesModule,
    PregnancyProfileModule,
    NotificationsModule,
    DoctorsModule,
    MedicalRecordsModule,
    RealtimeModule,
    ForumsModule,
    ChatbotModule,
    SchedulesModule,
    AppointmentsModule,
    PaymentModule,
  ],
})
export class AppModule {}
