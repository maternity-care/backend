import { DeepPartial } from 'typeorm';
import { Room } from '../entities/room.entity';
import { LookupRoomsDto, LookupRoomTypesDto, SearchRoomsDto, SearchRoomTypesDto } from '../dto/requests/search-rooms.dto';
import { PaginationResult } from '../../../common/helpers/pagination';
import { SearchRooms2Dto } from '../dto/requests/search-room-2';
import {
  RoomLookupResponseDto,
  RoomTypeResponseDto,
  RoomTypeLookupResponseDto,
  RoomWithDetailsResponseDto,
  FacilityRoomTypeResponseDto,
} from '../dto/responses/room-with-details-response.dto';
import { RoomType } from '../../../database/entities/room-type.entity';
export const ROOMS_REPOSITORY = Symbol('ROOMS_REPOSITORY');

export type RoomWithDetails = RoomWithDetailsResponseDto;
export type RoomLookup = RoomLookupResponseDto;
export type RoomTypeLookup = RoomTypeLookupResponseDto;
export type RoomTypeDetails = RoomTypeResponseDto;
export type FacilityRoomType = FacilityRoomTypeResponseDto;

export interface RoomSuspendImpact {
  affectedShifts: number;
  affectedAppointments: number;
  cancelledShifts?: number;
}

export interface IRoomsRepository {
  create(data: DeepPartial<Room>): Room;
  save(room: Room): Promise<Room>;
  saveMany(rooms: Room[]): Promise<Room[]>;
  findCodesByFacilityAndPrefix(facilityId: string, prefix: string): Promise<string[]>;
  findAll(filters?: SearchRoomsDto): Promise<RoomWithDetails[]>;
  findAllPaginated?( filters?: SearchRoomsDto): Promise<PaginationResult<RoomWithDetails>>;
  findById(id: string): Promise<Room | null>;
  findDetailsById(id: string): Promise<RoomWithDetails | null>;
  findByName(name: string): Promise<Room | null>;
  findByFacilityAndName(facilityId: string, name: string, excludeId?: string): Promise<Room | null>;
  createRoomType(data: DeepPartial<RoomType>): RoomType;
  saveRoomType(roomType: RoomType): Promise<RoomType>;
  findAllRoomTypes(filters?: SearchRoomTypesDto): Promise<RoomTypeDetails[]>;
  findAllRoomTypesPaginated?(filters?: SearchRoomTypesDto): Promise<PaginationResult<RoomTypeDetails>>;
  findRoomTypeById(id: string): Promise<RoomType | null>;
  findRoomTypeByName(name: string, excludeId?: string): Promise<RoomType | null>;
  findRoomTypeCodesByPrefix(prefix: string): Promise<string[]>;
  findRoomTypesByFacilityId(facilityId: string, filters?: LookupRoomTypesDto): Promise<FacilityRoomType[]>;
  lookup(filters?: LookupRoomsDto): Promise<RoomLookup[]>;
  lookupRoomTypes(filters?: LookupRoomTypesDto): Promise<RoomTypeLookup[]>;
  removeRoomType(roomType: RoomType): Promise<void>;
  countRoomTypeDependencies(roomTypeId: string): Promise<number>;
  remove(room: Room): Promise<void>;
  countDependencies(roomId: string): Promise<number>;
  softDelete(room: Room, reason?: string, deletedBy?: string | null): Promise<Room>;
  countSuspendImpact(roomId: string, from: Date, until?: Date | null): Promise<RoomSuspendImpact>;
  cancelFutureShiftsForRoom(
    roomId: string,
    from: Date,
    until?: Date | null,
    reason?: string | null,
    actorId?: string | null,
  ): Promise<number>;
  findByFacilityId(facilityId: string, filters?: SearchRoomsDto): Promise<RoomWithDetails[]>;
  findByFacilityIdPaginated?(facilityId: string, filters?: SearchRooms2Dto): Promise<PaginationResult<RoomWithDetails>>;
  findAllRoomsWithFacilitiesPaginated?( filters?: SearchRoomsDto): Promise<PaginationResult<Room>>;
}
