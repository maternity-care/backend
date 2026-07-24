import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { Room } from '../entities/room.entity';
import {
  FacilityRoomType,
  IRoomsRepository,
  RoomLookup,
  RoomTypeDetails,
  RoomTypeLookup,
  RoomWithDetails,
} from '../interfaces/rooms-repository.interface';
import { LookupRoomsDto, LookupRoomTypesDto, SearchRoomsDto, SearchRoomTypesDto } from '../dto/requests/search-rooms.dto';
import { SearchRooms2Dto } from '../dto/requests/search-room-2';
import { ActiveStatus } from '../../../common/constants/status.enum';
import { PaginationResult } from '../../../common/helpers/pagination';
import { RoomType } from '../../../database/entities/room-type.entity';

@Injectable()
export class RoomsRepository implements IRoomsRepository {
  constructor(
    @InjectRepository(Room)
    private readonly repository: Repository<Room>,
    @InjectRepository(RoomType)
    private readonly roomTypeRepository: Repository<RoomType>,
  ) {}

  create(data: DeepPartial<Room>): Room {
    return this.repository.create(data);
  }

  save(room: Room): Promise<Room> {
    return this.repository.save(room);
  }

  saveMany(rooms: Room[]): Promise<Room[]> {
    return this.repository.manager.transaction(manager => manager.save(Room, rooms));
  }

  async findCodesByFacilityAndPrefix(facilityId: string, prefix: string): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder('room')
      .withDeleted()
      .select('room.code', 'code')
      .where('room.facilityId = :facilityId', { facilityId })
      .andWhere('room.code LIKE :pattern', { pattern: `${prefix}-%` })
      .getRawMany<{ code: string }>();

    return rows.map(row => row.code);
  }

  findAll(filters?: SearchRoomsDto): Promise<RoomWithDetails[]> {
    return this.buildDetailsQuery(filters)
      .orderBy('room.createdAt', 'DESC')
      .getRawMany<RoomWithDetails>();
  }

  async findAllPaginated(filters?: SearchRoomsDto): Promise<PaginationResult<RoomWithDetails>> {
    const query = this.buildDetailsQuery(filters)
      .orderBy('room.createdAt', 'DESC');

    return this.paginateRaw<RoomWithDetails>(query, { page: filters?.page, limit: filters?.limit });
  }

  findById(id: string): Promise<Room | null> {
    return this.repository
      .createQueryBuilder('room')
      .where('room.id = :id', { id })
      .andWhere('room.deletedAt IS NULL')
      .getOne();
  }

  async findDetailsById(id: string): Promise<RoomWithDetails | null> {
    return (await this.buildDetailsQuery()
      .andWhere('room.id = :id', { id })
      .getRawOne<RoomWithDetails>()) ?? null;
  }

  findByName(name: string): Promise<Room | null> {
    return this.repository
      .createQueryBuilder('room')
      .where('LOWER(room.name) = LOWER(:name)', { name })
      .andWhere('room.deletedAt IS NULL')
      .getOne();
  }

  findByFacilityAndName(facilityId: string, name: string, excludeId?: string): Promise<Room | null> {
    const query = this.repository
      .createQueryBuilder('room')
      .where('room.facilityId = :facilityId', { facilityId })
      .andWhere('LOWER(room.name) = LOWER(:name)', { name })
      .andWhere('room.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('room.id != :excludeId', { excludeId });
    }

    return query.getOne();
  }

  createRoomType(data: DeepPartial<RoomType>): RoomType {
    return this.roomTypeRepository.create(data);
  }

  saveRoomType(roomType: RoomType): Promise<RoomType> {
    return this.roomTypeRepository.save(roomType);
  }

  findAllRoomTypes(filters?: SearchRoomTypesDto): Promise<RoomTypeDetails[]> {
    return this.buildRoomTypeQuery(filters)
      .orderBy('roomType.createdAt', 'DESC')
      .getRawMany<RoomTypeDetails>();
  }

  async findAllRoomTypesPaginated(filters?: SearchRoomTypesDto): Promise<PaginationResult<RoomTypeDetails>> {
    const query = this.buildRoomTypeQuery(filters)
      .orderBy('roomType.createdAt', 'DESC');

    return this.paginateRaw<RoomTypeDetails>(query as SelectQueryBuilder<any>, {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  findRoomTypeById(id: string): Promise<RoomType | null> {
    return this.roomTypeRepository
      .createQueryBuilder('roomType')
      .where('roomType.id = :id', { id })
      .andWhere('roomType.deletedAt IS NULL')
      .getOne();
  }

  findRoomTypeByName(name: string, excludeId?: string): Promise<RoomType | null> {
    const query = this.roomTypeRepository
      .createQueryBuilder('roomType')
      .where('LOWER(roomType.name) = LOWER(:name)', { name })
      .andWhere('roomType.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('roomType.id != :excludeId', { excludeId });
    }

    return query.getOne();
  }

  async findRoomTypeCodesByPrefix(prefix: string): Promise<string[]> {
    const rows = await this.roomTypeRepository
      .createQueryBuilder('roomType')
      .withDeleted()
      .select('roomType.code', 'code')
      .where('roomType.code LIKE :pattern', { pattern: `${prefix}%` })
      .getRawMany<{ code: string }>();

    return rows.map(row => row.code);
  }

  findRoomTypesByFacilityId(facilityId: string, filters?: LookupRoomTypesDto): Promise<FacilityRoomType[]> {
    const query = this.roomTypeRepository
      .createQueryBuilder('roomType')
      .innerJoin('rooms', 'room', 'room.room_type_id = roomType.id')
      .innerJoin('facilities', 'facility', 'facility.id = room.facility_id')
      .select('roomType.id', 'id')
      .addSelect('roomType.code', 'code')
      .addSelect('roomType.name', 'name')
      .addSelect('roomType.description', 'description')
      .addSelect('roomType.status', 'status')
      .addSelect('COUNT(room.id)', 'roomCount')
      .where('room.facility_id = :facilityId', { facilityId })
      .andWhere('room.deleted_at IS NULL')
      .andWhere('room.status = :roomStatus', { roomStatus: ActiveStatus.ACTIVE })
      .andWhere('roomType.deletedAt IS NULL')
      .andWhere('facility.deleted_at IS NULL')
      .groupBy('roomType.id')
      .addGroupBy('roomType.code')
      .addGroupBy('roomType.name')
      .addGroupBy('roomType.description')
      .addGroupBy('roomType.status')
      .orderBy('roomType.name', 'ASC')
      .limit(Math.max(1, Number(filters?.limit) || 50));

    if (filters?.search) {
      query.andWhere(
        '(LOWER(roomType.name) LIKE LOWER(:search) OR LOWER(roomType.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.status) {
      query.andWhere('roomType.status = :status', { status: filters.status });
    }

    return query.getRawMany<FacilityRoomType>();
  }

  lookup(filters?: LookupRoomsDto): Promise<RoomLookup[]> {
    const query = this.buildDetailsQuery({
      search: filters?.search,
      facilityId: filters?.facilityId,
      status: filters?.status,
    })
      .select('room.id', 'id')
      .addSelect('room.code', 'code')
      .addSelect('room.name', 'name')
      .addSelect('room.facilityId', 'facilityId')
      .addSelect('facility.name', 'facilityName')
      .addSelect('room.roomTypeId', 'roomTypeId')
      .addSelect('roomType.name', 'roomTypeName')
      .addSelect('room.floor', 'floor')
      .addSelect('room.status', 'status')
      .orderBy('facility.name', 'ASC')
      .addOrderBy('room.name', 'ASC')
      .limit(Math.max(1, Number(filters?.limit) || 20));

    return query.getRawMany<RoomLookup>();
  }

  lookupRoomTypes(filters?: LookupRoomTypesDto): Promise<RoomTypeLookup[]> {
    const query = this.roomTypeRepository
      .createQueryBuilder('roomType')
      .select('roomType.id', 'id')
      .addSelect('roomType.code', 'code')
      .addSelect('roomType.name', 'name')
      .addSelect('roomType.description', 'description')
      .addSelect('roomType.status', 'status')
      .orderBy('roomType.name', 'ASC')
      .limit(Math.max(1, Number(filters?.limit) || 20));

    query.andWhere('roomType.deletedAt IS NULL');

    if (filters?.search) {
      query.andWhere(
        '(LOWER(roomType.name) LIKE LOWER(:search) OR LOWER(roomType.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.status) {
      query.andWhere('roomType.status = :status', { status: filters.status });
    }

    return query.getRawMany<RoomTypeLookup>();
  }

  async remove(room: Room): Promise<void> {
    await this.repository.remove(room);
  }

  async removeRoomType(roomType: RoomType): Promise<void> {
    await this.roomTypeRepository.remove(roomType);
  }

  async countRoomTypeDependencies(roomTypeId: string): Promise<number> {
    const row = await this.repository
      .createQueryBuilder('room')
      .select('COUNT(*)', 'count')
      .where('room.roomTypeId = :roomTypeId', { roomTypeId })
      .andWhere('room.deletedAt IS NULL')
      .getRawOne<{ count: string }>();

    return Number(row?.count ?? 0);
  }

  async countDependencies(roomId: string): Promise<number> {
    const [shiftRow, appointmentRow] = await Promise.all([
      this.repository.manager.createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('shifts', 'shift')
        .where('shift.room_id = :roomId', { roomId })
        .getRawOne<{ count: string }>(),
      this.repository.manager.createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('appointments', 'appointment')
        .where('appointment.room_id = :roomId', { roomId })
        .getRawOne<{ count: string }>(),
    ]);

    return Number(shiftRow?.count ?? 0) + Number(appointmentRow?.count ?? 0);
  }

  async softDelete(room: Room, reason?: string, deletedBy?: string | null): Promise<Room> {
    room.status = ActiveStatus.INACTIVE;
    room.deletedAt = new Date();
    room.deletedBy = deletedBy ?? null;
    room.deletedReason = reason ?? null;
    return this.repository.save(room);
  }

  findByFacilityId(facilityId: string, filters?: SearchRooms2Dto): Promise<RoomWithDetails[]> {
    return this.buildDetailsQuery({ ...filters, facilityId })
      .orderBy('room.createdAt', 'DESC')
      .getRawMany<RoomWithDetails>();
  }

  findByFacilityIdPaginated(facilityId: string, filters?: SearchRooms2Dto): Promise<PaginationResult<RoomWithDetails>> {
    const query = this.buildDetailsQuery({ ...filters, facilityId })
      .orderBy('room.createdAt', 'DESC');

    return this.paginateRaw<RoomWithDetails>(query, { page: filters?.page, limit: filters?.limit });
  }

  private buildDetailsQuery(filters?: Pick<SearchRoomsDto, 'search' | 'floor' | 'status' | 'facilityId' | 'roomTypeId'>): SelectQueryBuilder<Room> {
    const query = this.repository
      .createQueryBuilder('room')
      .innerJoin('facilities', 'facility', 'facility.id = room.facilityId')
      .innerJoin('room_types', 'roomType', 'roomType.id = room.roomTypeId')
      .where('room.deletedAt IS NULL')
      .andWhere('facility.deletedAt IS NULL')
      .select('room.id', 'id')
      .addSelect('room.facilityId', 'facilityId')
      .addSelect('room.code', 'code')
      .addSelect('room.roomTypeId', 'roomTypeId')
      .addSelect('room.name', 'name')
      .addSelect('room.floor', 'floor')
      .addSelect('room.status', 'status')
      .addSelect('room.createdAt', 'createdAt')
      .addSelect('room.updatedAt', 'updatedAt')
      .addSelect('facility.code', 'facilityCode')
      .addSelect('facility.name', 'facilityName')
      .addSelect('facility.address', 'facilityAddress')
      .addSelect('facility.province', 'facilityProvince')
      .addSelect('facility.ward', 'facilityWard')
      .addSelect('facility.status', 'facilityStatus')
      .addSelect('roomType.name', 'roomTypeName')
      .addSelect('roomType.code', 'roomTypeCode')
      .addSelect('roomType.description', 'roomTypeDescription')
      .addSelect('roomType.status', 'roomTypeStatus');

    if (filters?.search) {
      query.andWhere(
        [
          'LOWER(room.name) LIKE LOWER(:search)',
          'LOWER(room.floor) LIKE LOWER(:search)',
          'LOWER(room.status) LIKE LOWER(:search)',
          'LOWER(facility.name) LIKE LOWER(:search)',
          'LOWER(facility.code) LIKE LOWER(:search)',
          'LOWER(roomType.name) LIKE LOWER(:search)',
          'LOWER(roomType.description) LIKE LOWER(:search)',
        ].join(' OR '),
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.floor) {
      query.andWhere('room.floor = :floor', { floor: filters.floor });
    }

    if (filters?.status) {
      query.andWhere('room.status = :status', { status: filters.status });
    }

    if (filters?.facilityId) {
      query.andWhere('room.facilityId = :facilityId', { facilityId: filters.facilityId });
    }

    if (filters?.roomTypeId) {
      query.andWhere('room.roomTypeId = :roomTypeId', { roomTypeId: filters.roomTypeId });
    }

    return query;
  }

  private buildRoomTypeQuery(filters?: Pick<SearchRoomTypesDto, 'search' | 'status'>): SelectQueryBuilder<RoomType> {
    const query = this.roomTypeRepository
      .createQueryBuilder('roomType')
      .select('roomType.id', 'id')
      .addSelect('roomType.code', 'code')
      .addSelect('roomType.name', 'name')
      .addSelect('roomType.description', 'description')
      .addSelect('roomType.status', 'status')
      .addSelect('roomType.createdAt', 'createdAt')
      .addSelect('roomType.updatedAt', 'updatedAt');

    query.where('roomType.deletedAt IS NULL');

    if (filters?.search) {
      query.andWhere(
        '(LOWER(roomType.name) LIKE LOWER(:search) OR LOWER(roomType.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.status) {
      query.andWhere('roomType.status = :status', { status: filters.status });
    }

    return query;
  }

  private async paginateRaw<T>(
    query: SelectQueryBuilder<any>,
    options?: { page?: number; limit?: number },
  ): Promise<PaginationResult<T>> {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const total = await query.clone().getCount();
    const items = await query.offset((page - 1) * limit).limit(limit).getRawMany<T>();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
