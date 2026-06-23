import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/requests/create-room.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';
import { Room } from './entities/rooms.entity';
import { IRoomsRepository, ROOMS_REPOSITORY } from './interfaces/rooms-repository.interface';
import { FacilitiesService } from '../facilities/facilities.service';

@Injectable()
export class RoomsService {
  constructor(
    @Inject(ROOMS_REPOSITORY)
    private readonly roomsRepository: IRoomsRepository,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  async create(dto: CreateRoomDto): Promise<Room> {
    await this.facilitiesService.findById(dto.facilityId);

    const existing = await this.findByName(dto.name);
    

    const room = this.roomsRepository.create(dto);
    return this.roomsRepository.save(room);
  }

  async findAll(): Promise<Room[]> {
    const rooms = await this.roomsRepository.findAll();
    if (!rooms || rooms.length === 0) {
      throw new NotFoundException('No rooms found');
    }
    return rooms;
  }

  async findById(id: string): Promise<Room> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  findByName(name: string): Promise<Room | null> {
    return this.roomsRepository.findByName(name);
  }

  async update(id: string, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.findById(id);

    if (dto.name && dto.name !== room.name) {
      const existing = await this.findByName(dto.name);
      if (existing) {
        throw new ConflictException('Room name already exists');
      }
    }

    Object.assign(room, dto);
    return this.roomsRepository.save(room);
  }

  async remove(id: string): Promise<void> {
    const room = await this.findById(id);
    await this.roomsRepository.remove(room);
  }

  findByFacilityId(facilityId: string): Promise<Room[]> {
    return this.roomsRepository.findByFacilityId(facilityId);
  }
}
