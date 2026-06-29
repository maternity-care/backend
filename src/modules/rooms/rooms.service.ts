import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/requests/create-room.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';
import { Room } from './entities/rooms.entity';
import { Facility } from '../facilities/entities/facilities.entity';
import { IRoomsRepository, ROOMS_REPOSITORY } from './interfaces/rooms-repository.interface';
import { FacilitiesService } from '../facilities/facilities.service';
import { SearchRoomsDto } from './dto/requests/search-rooms.dto';
import {ROOM_CONSTANT} from '../../common/constants/room.constant';
import {FACILITY_CONSTANT} from '../../common/constants/facility.constant';

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

  async findAll(filters?: SearchRoomsDto): Promise<Room[]> {
    return this.roomsRepository.findAll(filters);
  }

  async findAllPaginated(filters: SearchRoomsDto) {
    const result = await this.roomsRepository.findAllPaginated!(filters);
    return result;
  }

  async findById(id: string): Promise<Room> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException(ROOM_CONSTANT.ROOM_NOT_FOUND);
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
      throw new NotFoundException(FACILITY_CONSTANT.FACILITY_NOT_FOUND);
    }

    // nếu client gửi page => trả về phân trang
    if (filters?.page) {
      const paged = await this.roomsRepository.findByFacilityIdPaginated!(facilityId, filters);
      if (!paged || !paged.items || paged.items.length === 0) {
        throw new NotFoundException(ROOM_CONSTANT.ROOM_NOT_FOUND);
      }
      return {
        facility,
        rooms: (paged as any),
      } as any;
    }

    const rooms = await this.roomsRepository.findByFacilityId(facilityId, filters);

    return {
      facility,
      rooms,
    };
  }

  async findAllWithRooms(facility?: string, opts?: { facilityPage?: number; facilityLimit?: number; roomPage?: number; roomLimit?: number }):
    Promise<any> {
    // nếu paginate facilities
    if (opts?.facilityPage) {
      const facilitiesPaged = await this.facilitiesService.findAllPaginated({ page: opts.facilityPage, limit: opts.facilityLimit } as any);
      const items = await Promise.all(
        facilitiesPaged.items.map(async (facility) => {
          if (opts?.roomPage || opts?.roomLimit) {
            const roomsPaged = await this.roomsRepository.findByFacilityIdPaginated!(facility.id, { page: opts.roomPage, limit: opts.roomLimit } as any);
            return { facility, rooms: roomsPaged };
          }
          const rooms = await this.roomsRepository.findByFacilityId(facility.id);
          return { facility, rooms };
        }),
      );

      return {
        ...facilitiesPaged,
        items,
      };
    }

    const facilities = await this.facilitiesService.findAll();
    if (!facilities || facilities.length === 0) {
      throw new NotFoundException(FACILITY_CONSTANT.FACILITY_NOT_FOUND);
    }

    const result = await Promise.all(
      facilities.map(async (facility) => {
        try {
          if (opts?.roomPage || opts?.roomLimit) {
            const roomsPaged = await this.roomsRepository.findByFacilityIdPaginated!(facility.id, { page: opts.roomPage, limit: opts.roomLimit } as any);
            return { facility, rooms: roomsPaged };
          }
          const rooms = await this.roomsRepository.findByFacilityId(facility.id);
          return { facility, rooms };
        } catch (error) {
          return { facility, rooms: [] };
        }
      }),
    );

    return result;
  }
}
