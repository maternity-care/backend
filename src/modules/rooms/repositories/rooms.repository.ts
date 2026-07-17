import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { Room } from '../entities/rooms.entity';
import { IRoomsRepository, RoomWithDetails } from '../interfaces/rooms-repository.interface';
import { SearchRoomsDto } from '../dto/requests/search-rooms.dto';
import { SearchRooms2Dto } from '../dto/requests/search-room-2';
import { searchBuilder } from '../../../common/helpers/search-builder';
import { ActiveStatus } from '../../../common/constants/status.enum';
@Injectable()
export class RoomsRepository implements IRoomsRepository {
  constructor(
    @InjectRepository(Room)
    private readonly repository: Repository<Room>,
  ) {}

  create(data: DeepPartial<Room>): Room {
    return this.repository.create(data);
  }

  save(room: Room): Promise<Room> {
    return this.repository.save(room);
  }

  async findAll(filters?: SearchRoomsDto): Promise<RoomWithDetails[]> {
    const query = this.buildDetailsQuery()
      .where('room.deletedAt IS NULL');

    searchBuilder(query, filters?.search, {
      columns: ['name', 'roomType', 'floor', 'status', 'facilityId'],
    });

    if (filters?.floor) {
      query.andWhere('room.floor = :floor', { floor: filters.floor });
    }

    if (filters?.status) {
      query.andWhere('room.status = :status', { status: filters.status });
    }

    if (filters?.facilityId) {
      query.andWhere('room.facilityId = :facilityId', { facilityId: filters.facilityId });
    }

    query.orderBy('room.createdAt', 'DESC');

    return query.getRawMany<RoomWithDetails>();
  }

    async findAllPaginated(filters?: SearchRoomsDto) {
      const query = this.buildDetailsQuery()
        .where('room.deletedAt IS NULL');

      if (filters?.facilityId) {
        query.andWhere('room.facilityId = :facilityId', { facilityId: filters.facilityId });
      }

      searchBuilder(query, filters?.search, {
        columns: ['name', 'roomType', 'floor', 'status', 'facilityId'],
      });

      if (filters?.floor) {
        query.andWhere('room.floor = :floor', { floor: filters.floor });
      }

      if (filters?.status) {
        query.andWhere('room.status = :status', { status: filters.status });
      }

      query.orderBy('room.createdAt', 'DESC');

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
      .where('room.id = :id', { id })
      .andWhere('room.deletedAt IS NULL')
      .getRawOne<RoomWithDetails>()) ?? null;
  }

  findByName(name: string): Promise<Room | null> {
    return this.repository.findOne({ where: { name } });
  }

  async remove(room: Room): Promise<void> {
    await this.repository.remove(room);
  }

  async countDependencies(roomId: string): Promise<number> {
    const [shiftRow, appointmentRow] = await Promise.all([
      this.repository.manager.createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('doctor_shifts', 'shift')
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
    room.deleteReason = reason ?? null;
    return this.repository.save(room);
  }

  findByFacilityId(facilityId: string, filters?: SearchRooms2Dto): Promise<RoomWithDetails[]> {
    const query = this.buildDetailsQuery()
    .where('room.facilityId = :facilityId', { facilityId })
    .andWhere('room.deletedAt IS NULL');

    searchBuilder(query, filters?.search, {
      columns: ['name', 'roomType', 'floor', 'status', 'facilityId'],
    });

    if (filters?.floor) {
      query.andWhere('room.floor = :floor', { floor: filters.floor });
    }

    if (filters?.status) {
      query.andWhere('room.status = :status', { status: filters.status });
    }

    return query.getRawMany<RoomWithDetails>();
  }

  findByFacilityIdPaginated(facilityId: string, filters?: SearchRooms2Dto) {
    const query = this.buildDetailsQuery()
      .where('room.facilityId = :facilityId', { facilityId })
      .andWhere('room.deletedAt IS NULL');

    searchBuilder(query, filters?.search, {
      columns: ['name', 'roomType', 'floor', 'status', 'facilityId'],
    });

    if (filters?.floor) {
      query.andWhere('room.floor = :floor', { floor: filters.floor });
    }

    if (filters?.status) {
      query.andWhere('room.status = :status', { status: filters.status });
    }

    query.orderBy('room.createdAt', 'DESC');

    return this.paginateRaw<RoomWithDetails>(query, { page: filters?.page, limit: filters?.limit });
  }

  private buildDetailsQuery(): SelectQueryBuilder<Room> {
    return this.repository
      .createQueryBuilder('room')
      .innerJoin('facilities', 'facility', 'facility.id = room.facilityId')
      .select('room.id', 'id')
      .addSelect('room.facilityId', 'facilityId')
      .addSelect('room.name', 'name')
      .addSelect('room.roomType', 'roomType')
      .addSelect('room.floor', 'floor')
      .addSelect('room.status', 'status')
      .addSelect('room.createdAt', 'createdAt')
      .addSelect('room.updatedAt', 'updatedAt')
      .addSelect('facility.code', 'facilityCode')
      .addSelect('facility.name', 'facilityName')
      .addSelect('facility.address', 'facilityAddress')
      .addSelect('facility.province', 'facilityProvince')
      .addSelect('facility.district', 'facilityDistrict');
  }

  private async paginateRaw<T>(
    query: SelectQueryBuilder<Room>,
    options?: { page?: number; limit?: number },
  ) {
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
