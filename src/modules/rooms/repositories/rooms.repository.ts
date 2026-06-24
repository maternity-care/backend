import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Room } from '../entities/rooms.entity';
import { IRoomsRepository } from '../interfaces/rooms-repository.interface';

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

  async findByFacilityId(facilityId: string): Promise<Room[]> {
    const rooms = await this.repository.find({
      where: { facilityId },
      select: ['id', 'name', 'roomType', 'floor', 'status', 'createdAt', 'updatedAt'],
    });
    if (!rooms || rooms.length === 0) {
      throw new NotFoundException('Không tìm thấy phòng');
    }
    return rooms;
  }
}
