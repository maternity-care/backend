import { DeepPartial } from 'typeorm';
import { Room } from '../entities/rooms.entity';

export const ROOMS_REPOSITORY = Symbol('ROOMS_REPOSITORY');

export interface IRoomsRepository {
  create(data: DeepPartial<Room>): Room;
  save(room: Room): Promise<Room>;
  findAll(): Promise<Room[]>;
  findById(id: string): Promise<Room | null>;
  findByName(name: string): Promise<Room | null>;
  remove(room: Room): Promise<void>;
}
