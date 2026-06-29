import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ManagementStaffsController } from './management-staffs.controller';
import { StaffManagementService } from './staff-management.service';

@Module({
  imports: [UsersModule],
  controllers: [ManagementStaffsController],
  providers: [StaffManagementService],
  exports: [StaffManagementService],
})
export class StaffsModule {}
