import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CreateShiftSlotDto } from './dto/requests/create-shift-slot.dto';
import { LookupShiftSlotDto, SearchShiftSlotDto } from './dto/requests/search-shift-slot.dto';
import { UpdateShiftSlotDto } from './dto/requests/update-shift-slot.dto';
import { ShiftSlotLookupResponseDto, ShiftSlotResponseDto } from './dto/responses/shift-slot-response.dto';
import { ShiftSlotsService } from './shift-slots.service';

@ApiTags('Management - Shift Slots')
@Controller('management/shift-slots')
export class ShiftSlotsController {
  constructor(private readonly service: ShiftSlotsService) {}

  @Get()
  @ApiOperation({ summary: 'List shift slots for management' })
  @ApiResponse({ status: 200, type: [ShiftSlotResponseDto] })
  async findAll(@Query() query: SearchShiftSlotDto) {
    const data = await this.service.findAllPaginated(query);
    return {
      message: RESPONSE_MESSAGES.SHIFT_SLOTS.GET_LIST_SUCCESS,
      data,
    };
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Lookup shift slots for doctor-shift form select' })
  @ApiResponse({ status: 200, type: [ShiftSlotLookupResponseDto] })
  async lookup(@Query() query: LookupShiftSlotDto) {
    return {
      message: RESPONSE_MESSAGES.SHIFT_SLOTS.LOOKUP_SUCCESS,
      data: await this.service.lookup(query),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shift slot details' })
  @ApiResponse({ status: 200, type: ShiftSlotResponseDto })
  async findOne(@Param('id') id: string) {
    return {
      message: RESPONSE_MESSAGES.SHIFT_SLOTS.GET_SUCCESS,
      data: await this.service.findById(id),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create shift slot' })
  @ApiResponse({ status: 201, type: ShiftSlotResponseDto })
  async create(@Body() dto: CreateShiftSlotDto) {
    return {
      message: RESPONSE_MESSAGES.SHIFT_SLOTS.CREATED,
      data: await this.service.create(dto),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shift slot' })
  @ApiResponse({ status: 200, type: ShiftSlotResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateShiftSlotDto,
  ) {
    return {
      message: RESPONSE_MESSAGES.SHIFT_SLOTS.UPDATED,
      data: await this.service.update(id, dto),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete shift slot safely' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    return {
      message: RESPONSE_MESSAGES.SHIFT_SLOTS.DELETED,
      data: await this.service.remove(id),
    };
  }
}
