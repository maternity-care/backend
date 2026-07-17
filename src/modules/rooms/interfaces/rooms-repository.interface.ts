import { DeepPartial } from 'typeorm';
import { Room } from '../entities/rooms.entity';
import { SearchRoomsDto } from '../dto/requests/search-rooms.dto';
import { PaginationResult } from '../../../common/helpers/pagination';
import { SearchRooms2Dto } from '../dto/requests/search-room-2';
import { RoomWithDetailsResponseDto } from '../dto/responses/room-with-details-response.dto';
export const ROOMS_REPOSITORY = Symbol('ROOMS_REPOSITORY');

export type RoomWithDetails = RoomWithDetailsResponseDto;

export interface IRoomsRepository {
  create(data: DeepPartial<Room>): Room;
  save(room: Room): Promise<Room>;
  findAll(filters?: SearchRoomsDto): Promise<RoomWithDetails[]>;
  findAllPaginated?( filters?: SearchRoomsDto): Promise<PaginationResult<RoomWithDetails>>;
  findById(id: string): Promise<Room | null>;
  findDetailsById(id: string): Promise<RoomWithDetails | null>;
  findByName(name: string): Promise<Room | null>;
  remove(room: Room): Promise<void>;
  countDependencies(roomId: string): Promise<number>;
  softDelete(room: Room, reason?: string, deletedBy?: string | null): Promise<Room>;
  findByFacilityId(facilityId: string, filters?: SearchRoomsDto): Promise<RoomWithDetails[]>;
  findByFacilityIdPaginated?(facilityId: string, filters?: SearchRooms2Dto): Promise<PaginationResult<RoomWithDetails>>;
  findAllRoomsWithFacilitiesPaginated?( filters?: SearchRoomsDto): Promise<PaginationResult<Room>>;
}
