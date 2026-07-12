import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Room } from '../entities/rooms.entity';
import { IRoomsRepository } from '../interfaces/rooms-repository.interface';
import { SearchRoomsDto } from '../dto/requests/search-rooms.dto';
import { SearchRooms2Dto } from '../dto/requests/search-room-2';
import { paginate } from '../../../common/helpers/pagination';
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

  async findAll(filters?: SearchRoomsDto): Promise<Room[]> {
    const query = this.repository.createQueryBuilder('room').select([
      'room.id',
      'room.facilityId',
      'room.name',
      'room.roomType',
      'room.floor',
      'room.status',
      'room.createdAt',
      'room.updatedAt',
    ]).where('room.deletedAt IS NULL');

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

    return query.getMany();
  }

    async findAllPaginated(filters?: SearchRoomsDto) {
      const query = this.repository.createQueryBuilder('room').select([
        'room.id',
        'room.facilityId',
        'room.name',
        'room.roomType',
        'room.floor',
        'room.status',
        'room.createdAt',
        'room.updatedAt',
      ]).where('room.deletedAt IS NULL');

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

      return paginate(query, { page: filters?.page, limit: filters?.limit });
    }

  findById(id: string): Promise<Room | null> {
    return this.repository
      .createQueryBuilder('room')
      .where('room.id = :id', { id })
      .andWhere('room.deletedAt IS NULL')
      .getOne();
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

  findByFacilityId(facilityId: string, filters?: SearchRooms2Dto): Promise<Room[]> {
    const query = this.repository.createQueryBuilder('room')
    .where('room.facilityId = :facilityId', { facilityId })
    .andWhere('room.deletedAt IS NULL')
    .select([
      'room.id',
      'room.facilityId',
      'room.name',
      'room.roomType',
      'room.floor',
      'room.status',
      'room.createdAt',
      'room.updatedAt',
    ]);

    searchBuilder(query, filters?.search, {
      columns: ['name', 'roomType', 'floor', 'status', 'facilityId'],
    });

    if (filters?.floor) {
      query.andWhere('room.floor = :floor', { floor: filters.floor });
    }

    if (filters?.status) {
      query.andWhere('room.status = :status', { status: filters.status });
    }

    return query.getMany();
  }
}
