import { DeepPartial } from 'typeorm';
import { Room } from '../entities/rooms.entity';
import { SearchRoomsDto } from '../dto/requests/search-rooms.dto';
import { PaginationResult } from '../../../common/helpers/pagination';
import { SearchRooms2Dto } from '../dto/requests/search-room-2';
export const ROOMS_REPOSITORY = Symbol('ROOMS_REPOSITORY');

export interface IRoomsRepository {
  create(data: DeepPartial<Room>): Room;
  save(room: Room): Promise<Room>;
  findAll(filters?: SearchRoomsDto): Promise<Room[]>;
  findAllPaginated?( filters?: SearchRoomsDto): Promise<PaginationResult<Room>>;
  findById(id: string): Promise<Room | null>;
  findByName(name: string): Promise<Room | null>;
  remove(room: Room): Promise<void>;
  countDependencies(roomId: string): Promise<number>;
  softDelete(room: Room, reason?: string, deletedBy?: string | null): Promise<Room>;
  findByFacilityId(facilityId: string, filters?: SearchRoomsDto): Promise<Room[]>;
  findByFacilityIdPaginated?(facilityId: string, filters?: SearchRooms2Dto): Promise<PaginationResult<Room>>;
  findAllRoomsWithFacilitiesPaginated?( filters?: SearchRoomsDto): Promise<PaginationResult<Room>>;
}
