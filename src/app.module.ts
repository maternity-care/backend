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
import {FacilitiesModule} from "./modules/facilities/facilities.module";
import { RoomsModule } from './modules/rooms/rooms.module';
import { StaffsModule } from './modules/staffs/staffs.module';
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
  ],
})
export class AppModule {}
