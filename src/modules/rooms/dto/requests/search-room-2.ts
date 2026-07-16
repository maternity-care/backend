import { OmitType } from '@nestjs/swagger';
import { SearchRoomsDto } from './search-rooms.dto';

export class SearchRooms2Dto extends OmitType(SearchRoomsDto, ['facilityId'] as const) {}
