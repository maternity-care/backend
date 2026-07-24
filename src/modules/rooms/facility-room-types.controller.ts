import { Controller, Get, HttpException, InternalServerErrorException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { LookupRoomTypesDto } from './dto/requests/search-rooms.dto';
import { FacilityRoomTypeResponseDto } from './dto/responses/room-with-details-response.dto';
import { ROOM_CONSTANT } from '../../common/constants/room.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { assertFacilityAccess } from '../../common/helpers/facility-scope.helper';

@ApiTags('Management - Facilities')
@Controller('management/facilities')
export class FacilityRoomTypesController {
  constructor(private readonly roomsService: RoomsService) {}

  private handleError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException('Internal server error');
  }

  @Get(':facilityId/room-types')
  @ApiOperation({ summary: 'List room types currently used by a facility' })
  @ApiResponse({ status: 200, type: [FacilityRoomTypeResponseDto] })
  async findRoomTypesByFacility(
    @CurrentUser() user: AuthenticatedUser,
    @Param('facilityId') facilityId: string,
    @Query() query: LookupRoomTypesDto,
  ) {
    try {
      assertFacilityAccess(user, facilityId);
      return {
        message: ROOM_CONSTANT.ROOM_TYPE_FOUND,
        data: await this.roomsService.findRoomTypesByFacilityId(facilityId, query),
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}
