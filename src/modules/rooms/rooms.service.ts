import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/requests/create-room.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';
import { Room } from './entities/rooms.entity';
import { Facility } from '../facilities/entities/facilities.entity';
import { IRoomsRepository, ROOMS_REPOSITORY } from './interfaces/rooms-repository.interface';
import { FacilitiesService } from '../facilities/facilities.service';
import { SearchRoomsDto } from './dto/requests/search-rooms.dto';

@Injectable()
export class RoomsService {
  constructor(
    @Inject(ROOMS_REPOSITORY)
    private readonly roomsRepository: IRoomsRepository,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  async create(dto: CreateRoomDto): Promise<Room> {
    await this.facilitiesService.findById(dto.facilityId);
    const room = this.roomsRepository.create(dto);
    return this.roomsRepository.save(room);
  }

  async findAll(): Promise<Room[]> {
    const rooms = await this.roomsRepository.findAll();
    if (!rooms || rooms.length === 0) {
      throw new NotFoundException('Không tìm thấy phòng');
    }
    return rooms;
  }

  async findById(id: string): Promise<Room> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng');
    }
    return room;
  }

  findByName(name: string): Promise<Room | null> {
    return this.roomsRepository.findByName(name);
  }

  async update(id: string, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.findById(id);

    // if (dto.name && dto.name !== room.name) {
    //   const existing = await this.findByName(dto.name);
    //   if (existing) {
    //     throw new ConflictException('Room name already exists');
    //   }
    // }

    Object.assign(room, dto);
    return this.roomsRepository.save(room);
  }

  async remove(id: string): Promise<void> {
    const room = await this.findById(id);
    await this.roomsRepository.remove(room);
  }

  async findByFacilityId(facilityId: string, filters?: SearchRoomsDto): Promise<{ facility: Facility; rooms: Room[] }> {
    const facility = await this.facilitiesService.findById(facilityId);
    if (!facility) {
      throw new NotFoundException('không tìm thấy cơ sở');
    }

    const rooms = await this.roomsRepository.findByFacilityId(facilityId, filters);
    
    if (!rooms || rooms.length === 0) {
      throw new NotFoundException('Không tìm thấy phòng nào cho cơ sở này');
    }

    return {
      facility,
      rooms,
    };
  }

  async findAllWithRooms(): Promise<{ facility: Facility; rooms: Room[] }[]> {
    const facilities = await this.facilitiesService.findAll();
    if (!facilities || facilities.length === 0) {
      throw new NotFoundException('Không tìm thấy cơ sở nào');
    }

    const result = await Promise.all(
      facilities.map(async (facility) => {
        try {
          const rooms = await this.roomsRepository.findByFacilityId(facility.id);
          return { facility, rooms };
        } catch (error) {
          // Nếu facility không có room, trả về array rỗng
          return { facility, rooms: [] };
        }
      }),
    );

    return result;
  }
}
