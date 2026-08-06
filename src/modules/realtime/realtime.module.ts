import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { StaffPermission } from '../permissions/entities/staff-permission.entity';
import { Staff } from '../staffs/entities/staff.entity';
import { User } from '../users/entities/user.entity';
import { RealtimeEventsService } from './realtime-events.service';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Staff, StaffPermission, User])],
  providers: [RealtimeGateway, RealtimeEventsService],
  exports: [RealtimeEventsService],
})
export class RealtimeModule {}
