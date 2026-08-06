import { UserAuth } from './../auth/entities/user-auth.entity';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { User } from './entities/user.entity';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import { USERS_SERVICE } from './interfaces/users-service.interface';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ManagementSystemUsersController } from './management-system-users.controller';
import { Appointment } from '../appointments/entities/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Appointment, UserAuth]), MailModule, ConfigModule],
  controllers: [UsersController, ManagementSystemUsersController],
  providers: [
    UsersService,
    { provide: USERS_SERVICE, useExisting: UsersService },
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
  ],
  exports: [UsersService, USERS_SERVICE, USERS_REPOSITORY],
})
export class UsersModule {}
