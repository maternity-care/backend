import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Room } from '../entities/rooms.entity';
import { IRoomsRepository } from '../interfaces/rooms-repository.interface';
import { SearchRoomsDto } from '../dto/requests/search-rooms.dto';
import { SearchRooms2Dto } from '../dto/requests/search-room-2';
import { paginate } from '../../../common/helpers/pagination';
import { searchBuilder } from '../../../common/helpers/search-builder';
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
      ]);

      if (filters?.facilityId) {
        query.where('room.facilityId = :facilityId', { facilityId: filters.facilityId });
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
    return this.repository.findOne({ where: { id } });
  }

  findByName(name: string): Promise<Room | null> {
    return this.repository.findOne({ where: { name } });
  }

  async remove(room: Room): Promise<void> {
    await this.repository.remove(room);
  }

  findByFacilityId(facilityId: string, filters?: SearchRooms2Dto): Promise<Room[]> {
    const query = this.repository.createQueryBuilder('room').where('room.facilityId = :facilityId', { facilityId })
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
