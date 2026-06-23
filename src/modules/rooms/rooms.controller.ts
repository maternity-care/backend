import { Body, Controller, Delete, Get, HttpException, InternalServerErrorException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/requests/create-room.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';
import { RoomResponseDto } from './dto/responds/room-response.dto';

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
  async findAll() {
    try {
      const rooms = await this.roomsService.findAll();
      return {
        message: 'Lấy danh sách phòng thành công',
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
        message: 'Lấy thông tin phòng thành công',
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
        message: 'Tạo phòng thành công',
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
        message: 'Cập nhật thông tin phòng thành công',
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
      return { message: 'Xoá phòng thành công', data: null };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('facility/rooms/:facilityId')
  @ApiOperation({ summary: 'Get rooms by facility'})
  @ApiResponse({ status : 200, description: 'Rooms found', type: RoomResponseDto })
  async findRoomsByFacility(@Param('facilityId') id: string) {
    try {
      const rooms = await this.roomsService.findByFacilityId(id);
      return {
        message: 'Lấy danh sách phòng theo cơ sở thành công',
        data: rooms,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}
