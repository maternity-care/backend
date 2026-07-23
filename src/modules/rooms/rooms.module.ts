import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsRepository } from './repositories/rooms.repository';
import { ROOMS_REPOSITORY } from './interfaces/rooms-repository.interface';
import { RoomsFacilityController } from './rooms-facility.controller';
import { FacilitiesModule } from '../facilities/facilities.module';

@Module({
  imports: [TypeOrmModule.forFeature([Room]), FacilitiesModule],
  controllers: [RoomsController, RoomsFacilityController],
  providers: [
    RoomsService,
    { provide: ROOMS_REPOSITORY, useClass: RoomsRepository },
  ],
  exports: [RoomsService, ROOMS_REPOSITORY],
})
export class RoomsModule {}
