import { Body, Controller, Delete, Get, HttpException, InternalServerErrorException, Param, Patch, Post, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/requests/create-room.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';
import { RoomResponseDto } from './dto/responds/room-response.dto';
import { RoomsWithFacilityResponseDto } from './dto/responds/rooms-with-facility-response.dto';
import { SearchRoomsDto } from './dto/requests/search-rooms.dto';
import { IsOptional } from 'class-validator';
import { ROOM_CONSTANT } from '../../common/constants/room.constant';
@ApiTags('Management - Rooms')
@ApiBearerAuth()
//@UseGuards(JwtAuthGuard)
@Controller('management/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  private handleError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException('Internal server error');
  }

  @Get()
  @ApiOperation({ summary: 'List rooms' })
  @ApiResponse({ status: 200, description: 'Rooms found', type: [RoomResponseDto] })
  async findAll(@Query() query: SearchRoomsDto) {
    try {
      if (query?.page) {
        const paged = await this.roomsService.findAllPaginated(query);
        return {
          message: ROOM_CONSTANT.ROOM_FOUND,
          data: paged,
        };
      }

      const rooms = await this.roomsService.findAll(query);
      return {
        message: ROOM_CONSTANT.ROOM_FOUND,
        data: rooms,
      };
    } catch (error) {
      this.handleError(error);
    }
  }


  @Get(':id')
  @ApiOperation({ summary: 'Get room details' })
  @ApiResponse({ status: 200, description: 'Room found', type: RoomResponseDto })
  async findOne(@Param('id') id: string) {
    try {
      const room = await this.roomsService.findById(id);
      return {
        message: ROOM_CONSTANT.ROOM_DETAIL_FOUND,
        data: room,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create room' })
  @ApiResponse({ status: 201, type: RoomResponseDto })
  async create(@Body() dto: CreateRoomDto) {
    try {
      const room = await this.roomsService.create(dto);
      return {
        message: ROOM_CONSTANT.CREATED_SUCCESSFULLY,
        data: room,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update room' })
  @ApiResponse({ status: 200, type: RoomResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    try {
      const room = await this.roomsService.update(id, dto);
      return {
        message: ROOM_CONSTANT.UPDATED_SUCCESSFULLY,
        data: room,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete room' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    try {
      await this.roomsService.remove(id);
      return { message: ROOM_CONSTANT.DELETED_SUCCESSFULLY, data: null };
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
