import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserPermission } from '../permissions/entities/staff-permission.entity';
import { RolesModule } from '../roles/roles.module';
import { MailModule } from '../mail/mail.module';
import { StaffProfile } from '../staffs/entities/staff.entity';
import { STAFF_PROFILE_REPOSITORY } from '../staffs/interfaces/staff-profile-repository.interface';
import { StaffProfileRepository } from '../staffs/repositories/staff-profile.repository';
import { User } from './entities/user.entity';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import { USERS_SERVICE } from './interfaces/users-service.interface';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MailService } from '../mail/mail.service';
import { MAIL_SERVICE } from '../mail/interfaces/mail-service.interface';
import { ManagementSystemUsersController } from './management-system-users.controller';
import { FacilityStaff } from '../facilities/entities/facility-staff.entity';
import { Facility } from '../facilities/entities/facility.entity';
import { Doctor } from '../doctors/entities/doctor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserPermission,
      StaffProfile,
      FacilityStaff,
      Facility,
      Doctor,
    ]),
    RolesModule,
    PermissionsModule,
    MailModule,
    ConfigModule,
  ],
  controllers: [
    UsersController,
    ManagementSystemUsersController,
  ],
  providers: [
    UsersService,
    { provide: USERS_SERVICE, useExisting: UsersService },
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
    { provide: STAFF_PROFILE_REPOSITORY, useClass: StaffProfileRepository },
    { provide: MAIL_SERVICE, useClass: MailService },
  ],
  exports: [UsersService, USERS_SERVICE, USERS_REPOSITORY, STAFF_PROFILE_REPOSITORY, MAIL_SERVICE],
})
export class UsersModule {}
