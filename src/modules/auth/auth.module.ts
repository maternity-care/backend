import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { StaffsModule } from '../staffs/staffs.module';
import { JobsModule } from '../jobs/jobs.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Staff } from '../staffs/entities/staff.entity';
import { Facility } from '../facilities/entities/facility.entity';
import { StaffRefreshToken } from './entities/staff-refresh-token.entity';
import { StaffPasswordResetToken } from './entities/staff-password-reset-token.entity';
import { ManagementAuthController } from './management-auth.controller';
import { USER_AUTH_REPOSITORY } from './interfaces/user-auth-repository.interface';
import { UserAuthRepository } from './repositories/user-auth.repository';
import { UserAuth } from './entities/user-auth.entity';

@Module({
  imports: [
    UsersModule,
    StaffsModule,
    RolesModule,
    JobsModule,
    PassportModule,
    TypeOrmModule.forFeature([
      RefreshToken,
      PasswordResetToken,
      Staff,
      Facility,
      StaffRefreshToken,
      StaffPasswordResetToken,
      UserAuth,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('jwt.expiresIn'),
        },
      }),
    }),
  ],
  controllers: [AuthController, ManagementAuthController],
  providers: [
    AuthService,
    JwtStrategy,
    UserAuthRepository,
    {
      provide: USER_AUTH_REPOSITORY,
      useExisting: UserAuthRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
