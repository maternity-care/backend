import { Body, Controller, Delete, Get, HttpException, InternalServerErrorException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { BulkCreateRoomsDto, BulkCreateRoomsPreviewDto, CreateRoomDto } from './dto/requests/create-room.dto';
import { CreateRoomTypeDto } from './dto/requests/create-room-type.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';
import { UpdateRoomTypeDto } from './dto/requests/update-room-type.dto';
import { RoomResponseDto } from './dto/responds/room-response.dto';
import { RoomsWithFacilityResponseDto } from './dto/responds/rooms-with-facility-response.dto';
import {
  RoomLookupResponseDto,
  RoomPaginatedResponseDto,
  RoomTypeResponseDto,
  RoomTypeLookupResponseDto,
  RoomTypePaginatedResponseDto,
  RoomWithDetailsResponseDto,
} from './dto/responses/room-with-details-response.dto';
import { LookupRoomsDto, LookupRoomTypesDto, SearchRoomsDto, SearchRoomTypesDto } from './dto/requests/search-rooms.dto';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  assertFacilityAccess,
  getActiveFacilityId,
} from '../../common/helpers/facility-scope.helper';

@ApiTags('Management - Rooms')
@Controller('management/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  private handleError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException(RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR);
  }

  @Get()
  @ApiOperation({ summary: 'List rooms' })
  @ApiResponse({ status: 200, description: 'Rooms found', type: RoomPaginatedResponseDto })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchRoomsDto,
  ) {
    try {
      const activeFacilityId = getActiveFacilityId(user);
      if (activeFacilityId) {
        query.facilityId = activeFacilityId;
      }
      return {
        message: RESPONSE_MESSAGES.ROOMS.GET_LIST_SUCCESS,
        data: await this.roomsService.findAllPaginated(query),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // @Get('lookup')
  // @ApiOperation({ summary: 'Lookup rooms for select/autocomplete' })
  // @ApiResponse({ status: 200, type: [RoomLookupResponseDto] })
  // async lookup(
  //   @CurrentUser() user: AuthenticatedUser,
  //   @Query() query: LookupRoomsDto,
  // ) {
  //   try {
  //     const activeFacilityId = getActiveFacilityId(user);
  //     if (activeFacilityId) {
  //       query.facilityId = activeFacilityId;
  //     }
  //     return {
  //       message: RESPONSE_MESSAGES.ROOMS.LOOKUP_SUCCESS,
  //       data: await this.roomsService.lookup(query),
  //     };
  //   } catch (error) {
  //     this.handleError(error);
  //   }
  // }

  @Get('room-types/lookup')
  @ApiOperation({ summary: 'Lookup room types for room form select/autocomplete' })
  @ApiResponse({ status: 200, type: [RoomTypeLookupResponseDto] })
  async lookupRoomTypes(@Query() query: LookupRoomTypesDto) {
    try {
      return {
        message: RESPONSE_MESSAGES.ROOM_TYPES.LOOKUP_SUCCESS,
        data: await this.roomsService.lookupRoomTypes(query),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('room-types')
  @ApiOperation({ summary: 'List room types' })
  @ApiResponse({ status: 200, type: RoomTypePaginatedResponseDto })
  async findAllRoomTypes(@Query() query: SearchRoomTypesDto) {
    try {
      return {
        message: RESPONSE_MESSAGES.ROOM_TYPES.GET_LIST_SUCCESS,
        data: await this.roomsService.findAllRoomTypesPaginated(query),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('room-types/:id')
  @ApiOperation({ summary: 'Get room type details' })
  @ApiResponse({ status: 200, type: RoomTypeResponseDto })
  async findRoomTypeById(@Param('id') id: string) {
    try {
      return {
        message: RESPONSE_MESSAGES.ROOM_TYPES.GET_SUCCESS,
        data: await this.roomsService.findRoomTypeById(id),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post('room-types')
  @ApiOperation({ summary: 'Create room type' })
  @ApiResponse({ status: 201, type: RoomTypeResponseDto })
  async createRoomType(@Body() dto: CreateRoomTypeDto) {
    try {
      return {
        message: RESPONSE_MESSAGES.ROOM_TYPES.CREATED,
        data: await this.roomsService.createRoomType(dto),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch('room-types/:id')
  @ApiOperation({ summary: 'Update room type' })
  @ApiResponse({ status: 200, type: RoomTypeResponseDto })
  async updateRoomType(
    @Param('id') id: string,
    @Body() dto: UpdateRoomTypeDto,
  ) {
    try {
      return {
        message: RESPONSE_MESSAGES.ROOM_TYPES.UPDATED,
        data: await this.roomsService.updateRoomType(id, dto),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete('room-types/:id')
  @ApiOperation({ summary: 'Delete room type when unused, otherwise deactivate it' })
  @ApiResponse({ status: 200 })
  async removeRoomType(@Param('id') id: string) {
    try {
      return {
        message: RESPONSE_MESSAGES.ROOM_TYPES.DELETED,
        data: await this.roomsService.removeRoomType(id),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('all/by-facilities')
  @ApiOperation({ summary: 'List facilities with their rooms' })
  async findAllByFacilities(@CurrentUser() user: AuthenticatedUser) {
    const activeFacilityId = getActiveFacilityId(user);
    const data = activeFacilityId
      ? [await this.roomsService.findByFacilityId(activeFacilityId)]
      : await this.roomsService.findAllWithRooms();

    return {
      message: RESPONSE_MESSAGES.ROOMS.GET_LIST_SUCCESS,
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room details' })
  @ApiResponse({ status: 200, description: 'Room found', type: RoomWithDetailsResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    try {
      const room = await this.roomsService.findDetailsById(id);
      assertFacilityAccess(user, room.facilityId);
      return {
        message: RESPONSE_MESSAGES.ROOMS.GET_SUCCESS,
        data: room,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create room' })
  @ApiResponse({ status: 201, type: RoomResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoomDto,
  ) {
    try {
      const activeFacilityId = getActiveFacilityId(user);
      if (activeFacilityId) {
        dto.facilityId = activeFacilityId;
      }
      const room = await this.roomsService.create(dto);
      return {
        message: RESPONSE_MESSAGES.ROOMS.CREATED,
        data: room,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create rooms' })
  @ApiResponse({ status: 201, type: [RoomWithDetailsResponseDto] })
  async bulkCreate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkCreateRoomsDto,
  ) {
    try {
      const activeFacilityId = getActiveFacilityId(user);
      if (activeFacilityId) {
        dto.rooms = dto.rooms.map(room => ({ ...room, facilityId: activeFacilityId }));
      }
      return {
        message: RESPONSE_MESSAGES.ROOMS.BULK_CONFIRM_SUCCESS,
        data: await this.roomsService.bulkCreate(dto),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // @Post('bulk-create/preview')
  // @ApiOperation({ summary: 'Preview bulk create rooms before saving' })
  // async previewBulkCreate(
  //   @CurrentUser() user: AuthenticatedUser,
  //   @Body() dto: BulkCreateRoomsPreviewDto,
  // ) {
  //   try {
  //     const activeFacilityId = getActiveFacilityId(user);
  //     if (activeFacilityId) {
  //       dto.rooms = dto.rooms.map(room => ({ ...room, facilityId: activeFacilityId }));
  //     }
  //     return {
  //       message: RESPONSE_MESSAGES.ROOMS.BULK_PREVIEW_SUCCESS,
  //       data: await this.roomsService.previewBulkCreate(dto),
  //     };
  //   } catch (error) {
  //     this.handleError(error);
  //   }
  // }

  // @Post('bulk-create/confirm')
  // @ApiOperation({ summary: 'Confirm and save valid rooms from bulk-create preview' })
  // async confirmBulkCreate(
  //   @CurrentUser() user: AuthenticatedUser,
  //   @Body() dto: BulkCreateRoomsPreviewDto,
  // ) {
  //   try {
  //     const activeFacilityId = getActiveFacilityId(user);
  //     if (activeFacilityId) {
  //       dto.rooms = dto.rooms.map(room => ({ ...room, facilityId: activeFacilityId }));
  //     }
  //     return {
  //       message: RESPONSE_MESSAGES.ROOMS.BULK_CONFIRM_SUCCESS,
  //       data: await this.roomsService.confirmBulkCreate(dto),
  //     };
  //   } catch (error) {
  //     this.handleError(error);
  //   }
  // }

  @Patch(':id')
  @ApiOperation({ summary: 'Update room' })
  @ApiResponse({ status: 200, type: RoomResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    try {
      const existingRoom = await this.roomsService.findById(id);
      assertFacilityAccess(user, existingRoom.facilityId);
      const room = await this.roomsService.update(id, dto);
      return {
        message: RESPONSE_MESSAGES.ROOMS.UPDATED,
        data: room,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete room' })
  @ApiResponse({ status: 200 })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    try {
      const room = await this.roomsService.findById(id);
      assertFacilityAccess(user, room.facilityId);
      const data = await this.roomsService.remove(id, reason, user?.id ?? null);
      return { message: RESPONSE_MESSAGES.ROOMS.DELETED, data };
    } catch (error) {
      this.handleError(error);
    }
  }

  // @Get('facility/rooms/:facilityId')
  // @ApiOperation({ summary: 'Get rooms by facility'})
  // @ApiResponse({ status : 200, description: 'Rooms found', type: RoomResponseDto })
  // async findRoomsByFacility(@Param('facilityId') id: string) {
  //   try {
  //     const rooms = await this.roomsService.findByFacilityId(id);
  //     return {
  //       message: 'Lấy danh sách phòng theo cơ sở thành công',
  //       data: rooms,
  //     };
  //   } catch (error) {
  //     this.handleError(error);
  //   }
  // }
}
