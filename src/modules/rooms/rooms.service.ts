import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/rooms.entity';
import { CreateRoomDto } from './dto/requests/create-room.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

  async create(dto: CreateRoomDto): Promise<Room> {
    const existing = await this.findByName(dto.name);
    if (existing) {
      throw new ConflictException('Room name already exists');
    }

    const room = this.roomRepository.create(dto);
    return this.roomRepository.save(room);
  }

  findAll(): Promise<Room[]> {
    return this.roomRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  findByName(name: string): Promise<Room | null> {
    return this.roomRepository.findOne({ where: { name } });
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
    return this.roomRepository.save(room);
  }

  async remove(id: string): Promise<void> {
    const room = await this.findById(id);
    await this.roomRepository.remove(room);
  }
}
