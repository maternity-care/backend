import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Facility } from '../facilities/entities/facility.entity';
import { JobsModule } from '../jobs/jobs.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { StaffPermission } from '../permissions/entities/staff-permission.entity';
import { Role } from '../roles/entities/role.entity';
import { RolesModule } from '../roles/roles.module';
import { ManagementStaffsController } from './management-staffs.controller';
import { Staff } from './entities/staff.entity';
import { STAFF_PROFILE_REPOSITORY } from './interfaces/staff-profile-repository.interface';
import { StaffProfileRepository } from './repositories/staff-profile.repository';
import { StaffManagementService } from './staff-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff, Facility, Doctor, StaffPermission, Role]),
    RolesModule,
    PermissionsModule,
    JobsModule,
    ConfigModule,
  ],
  controllers: [ManagementStaffsController],
  providers: [
    StaffManagementService,
    { provide: STAFF_PROFILE_REPOSITORY, useClass: StaffProfileRepository },
  ],
  exports: [StaffManagementService, STAFF_PROFILE_REPOSITORY],
})
export class StaffsModule {}
