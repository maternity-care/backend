import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Room } from '../entities/rooms.entity';
import { IRoomsRepository } from '../interfaces/rooms-repository.interface';
import { SearchRoomsDto } from '../dto/requests/search-rooms.dto';
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

  findAll(): Promise<Room[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
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

  findByFacilityId(facilityId: string, filters?: SearchRoomsDto): Promise<Room[]> {
    const query = this.repository.createQueryBuilder('room').where('room.facilityId = :facilityId', { facilityId })
    .select(['room.id', 'room.name', 'room.floor', 'room.status', 'room.createdAt', 'room.updatedAt']);

    if (filters?.search) {
      query.andWhere(
        'LOWER(room.name) LIKE LOWER(:search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.floor) {
      query.andWhere('room.floor = :floor', { floor: filters.floor });
    }

    if (filters?.status) {
      query.andWhere('room.status = :status', { status: filters.status });
    }

    return query.getMany();
  }
}
