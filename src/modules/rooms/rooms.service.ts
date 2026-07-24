import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BulkCreateRoomsDto, CreateRoomDto } from './dto/requests/create-room.dto';
import { CreateRoomTypeDto } from './dto/requests/create-room-type.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';
import { UpdateRoomTypeDto } from './dto/requests/update-room-type.dto';
import { Room } from './entities/room.entity';
import { Facility } from '../facilities/entities/facility.entity';
import {
  IRoomsRepository,
  ROOMS_REPOSITORY,
  RoomLookup,
  RoomTypeDetails,
  RoomTypeLookup,
  RoomWithDetails,
} from './interfaces/rooms-repository.interface';
import { FacilitiesService } from '../facilities/facilities.service';
import { LookupRoomsDto, LookupRoomTypesDto, SearchRoomsDto, SearchRoomTypesDto } from './dto/requests/search-rooms.dto';
import {ROOM_CONSTANT} from '../../common/constants/room.constant';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { ActiveStatus, FacilityStatus } from '../../common/constants/status.enum';

@Injectable()
export class RoomsService {
  constructor(
    @Inject(ROOMS_REPOSITORY)
    private readonly roomsRepository: IRoomsRepository,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  async create(dto: CreateRoomDto): Promise<RoomWithDetails> {
    await this.validateRoomPayload(dto);
    const room = this.roomsRepository.create(dto);
    const saved = await this.roomsRepository.save(room);
    return this.findDetailsById(saved.id);
  }

  async bulkCreate(dto: BulkCreateRoomsDto): Promise<RoomWithDetails[]> {
    this.ensureNoDuplicateRoomsInPayload(dto.rooms);
    await Promise.all(dto.rooms.map(room => this.validateRoomPayload(room)));

    const rooms = dto.rooms.map(room => this.roomsRepository.create(room));
    const savedRooms = await this.roomsRepository.saveMany(rooms);
    return Promise.all(savedRooms.map(room => this.findDetailsById(room.id)));
  }

  async findAll(filters?: SearchRoomsDto): Promise<RoomWithDetails[]> {
    return this.roomsRepository.findAll(filters);
  }

  async findAllPaginated(filters: SearchRoomsDto) {
    const result = await this.roomsRepository.findAllPaginated!(filters);
    return result;
  }

  async createRoomType(dto: CreateRoomTypeDto): Promise<RoomTypeDetails> {
    await this.ensureRoomTypeNameUnique(dto.name);
    const roomType = this.roomsRepository.createRoomType({
      ...dto,
      status: dto.status ?? ActiveStatus.ACTIVE,
    });
    return this.roomsRepository.saveRoomType(roomType);
  }

  async findAllRoomTypes(filters?: SearchRoomTypesDto): Promise<RoomTypeDetails[]> {
    const roomTypes = await this.roomsRepository.findAllRoomTypes(filters);
    if (!roomTypes || roomTypes.length === 0) {
      throw new NotFoundException(ROOM_CONSTANT.ROOM_TYPE_NOT_FOUND);
    }
    return roomTypes;
  }

  async findAllRoomTypesPaginated(filters?: SearchRoomTypesDto) {
    const result = await this.roomsRepository.findAllRoomTypesPaginated!(filters);
    if (!result || !result.items || result.items.length === 0) {
      throw new NotFoundException(ROOM_CONSTANT.ROOM_TYPE_NOT_FOUND);
    }
    return result;
  }

  async findRoomTypeById(id: string): Promise<RoomTypeDetails> {
    const roomType = await this.roomsRepository.findRoomTypeById(id);
    if (!roomType) {
      throw new NotFoundException(ROOM_CONSTANT.ROOM_TYPE_NOT_FOUND);
    }
    return roomType;
  }

  async updateRoomType(id: string, dto: UpdateRoomTypeDto): Promise<RoomTypeDetails> {
    const roomType = await this.findRoomTypeById(id);
    if (dto.name && dto.name !== roomType.name) {
      await this.ensureRoomTypeNameUnique(dto.name, roomType.id);
    }

    Object.assign(roomType, dto);
    return this.roomsRepository.saveRoomType(roomType);
  }

  async removeRoomType(id: string): Promise<SafeRemoveResult> {
    const roomType = await this.findRoomTypeById(id);
    const dependencyCount = await this.roomsRepository.countRoomTypeDependencies(roomType.id);
    if (dependencyCount === 0) {
      await this.roomsRepository.removeRoomType(roomType);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    roomType.status = ActiveStatus.INACTIVE;
    await this.roomsRepository.saveRoomType(roomType);
    return { action: 'soft_deleted', affectedCount: dependencyCount };
  }

  async findById(id: string): Promise<Room> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException(ROOM_CONSTANT.ROOM_NOT_FOUND);
    }
    return room;
  }

  async findDetailsById(id: string): Promise<RoomWithDetails> {
    const room = await this.roomsRepository.findDetailsById(id);
    if (!room) {
      throw new NotFoundException(ROOM_CONSTANT.ROOM_NOT_FOUND);
    }
    return room;
  }

  findByName(name: string): Promise<Room | null> {
    return this.roomsRepository.findByName(name);
  }

  async update(id: string, dto: UpdateRoomDto): Promise<RoomWithDetails> {
    const room = await this.findById(id);

    if (dto.roomTypeId) {
      await this.validateRoomType(dto.roomTypeId);
    }

    if (dto.name && dto.name !== room.name) {
      await this.ensureRoomNameUnique(room.facilityId, dto.name, room.id);
    }

    Object.assign(room, dto);
    const saved = await this.roomsRepository.save(room);
    return this.findDetailsById(saved.id);
  }

  async remove(id: string, reason?: string, deletedBy?: string | null): Promise<SafeRemoveResult> {
    const room = await this.findById(id);
    const dependencyCount = await this.roomsRepository.countDependencies(room.id);
    if (dependencyCount === 0) {
      await this.roomsRepository.remove(room);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    await this.roomsRepository.softDelete(room, reason, deletedBy);
    return { action: 'soft_deleted', affectedCount: dependencyCount };
  }

  async findByFacilityId(facilityId: string, filters?: SearchRoomsDto): Promise<{ facility: Facility; rooms: RoomWithDetails[] }> {
    const facility = await this.facilitiesService.findById(facilityId);
    if (!facility) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITY_NOT_FOUND);
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
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITY_NOT_FOUND);
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

  lookup(filters?: LookupRoomsDto): Promise<RoomLookup[]> {
    return this.roomsRepository.lookup(filters);
  }

  lookupRoomTypes(filters?: LookupRoomTypesDto): Promise<RoomTypeLookup[]> {
    return this.roomsRepository.lookupRoomTypes(filters);
  }

  private async validateRoomPayload(dto: CreateRoomDto): Promise<void> {
    const facility = await this.facilitiesService.findById(dto.facilityId);
    if (facility.status !== FacilityStatus.ACTIVE) {
      throw new ConflictException(RESPONSE_MESSAGES.FACILITY_NOT_FOUND);
    }

    await Promise.all([
      this.validateRoomType(dto.roomTypeId),
      this.ensureRoomNameUnique(dto.facilityId, dto.name),
    ]);
  }

  private async validateRoomType(roomTypeId: string): Promise<void> {
    const roomType = await this.roomsRepository.findRoomTypeById(roomTypeId);
    if (!roomType || roomType.status !== ActiveStatus.ACTIVE) {
      throw new NotFoundException('Loại phòng không tồn tại hoặc đang ngừng hoạt động');
    }
  }

  private async ensureRoomTypeNameUnique(name: string, excludeId?: string): Promise<void> {
    const existing = await this.roomsRepository.findRoomTypeByName(name, excludeId);
    if (existing) {
      throw new ConflictException({
        message: ROOM_CONSTANT.ROOM_TYPE_ALREADY_EXISTS,
        data: {
          duplicatedField: 'name',
          duplicatedData: this.toDuplicateRoomTypeData(existing),
        },
      });
    }
  }

  private async ensureRoomNameUnique(facilityId: string, name: string, excludeId?: string): Promise<void> {
    const existing = await this.roomsRepository.findByFacilityAndName(facilityId, name, excludeId);
    if (existing) {
      const existingDetails = await this.roomsRepository.findDetailsById(existing.id);
      throw new ConflictException({
        message: ROOM_CONSTANT.ROOM_ALREADY_EXISTS,
        data: {
          duplicatedField: 'name',
          duplicatedData: this.toDuplicateRoomData(existingDetails ?? existing),
        },
      });
    }
  }

  private ensureNoDuplicateRoomsInPayload(rooms: CreateRoomDto[]): void {
    const keys = new Set<string>();
    for (const room of rooms) {
      const key = `${room.facilityId}:${room.name.trim().toLowerCase()}`;
      if (keys.has(key)) {
        throw new BadRequestException({
          message: 'Danh sách tạo phòng có phòng bị trùng tên trong cùng cơ sở',
          data: {
            duplicatedField: 'name',
            duplicatedData: {
              facilityId: room.facilityId,
              name: room.name,
              roomTypeId: room.roomTypeId,
              floor: room.floor,
              status: room.status,
            },
          },
        });
      }
      keys.add(key);
    }
  }

  private toDuplicateRoomData(room: Room | RoomWithDetails) {
    return {
      id: room.id,
      facilityId: room.facilityId,
      roomTypeId: room.roomTypeId,
      name: room.name,
      floor: room.floor,
      status: room.status,
      facilityCode: (room as RoomWithDetails).facilityCode,
      facilityName: (room as RoomWithDetails).facilityName,
      roomTypeName: (room as RoomWithDetails).roomTypeName,
      roomTypeStatus: (room as RoomWithDetails).roomTypeStatus,
    };
  }

  private toDuplicateRoomTypeData(roomType: RoomTypeDetails | { id: string; name: string; description?: string; status?: ActiveStatus }) {
    return {
      id: roomType.id,
      name: roomType.name,
      description: roomType.description,
      status: roomType.status,
    };
  }
}
