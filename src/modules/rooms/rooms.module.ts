import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/rooms.entity';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsRepository } from './repositories/rooms.repository';
import { ROOMS_REPOSITORY } from './interfaces/rooms-repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Room])],
  controllers: [RoomsController],
  providers: [
    RoomsService,
    { provide: ROOMS_REPOSITORY, useClass: RoomsRepository },
    { provide: ROOMS_REPOSITORY, useClass: RoomsRepository },
  ],
  exports: [RoomsService, ROOMS_REPOSITORY],
})
export class RoomsModule {}
