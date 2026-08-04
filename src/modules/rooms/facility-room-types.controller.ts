import { Controller, Get, HttpException, InternalServerErrorException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { LookupRoomTypesDto } from './dto/requests/search-rooms.dto';
import { FacilityRoomTypeResponseDto } from './dto/responses/room-with-details-response.dto';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { assertFacilityAccess } from '../../common/helpers/facility-scope.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Management - Facilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('management/facilities')
export class FacilityRoomTypesController {
  constructor(private readonly roomsService: RoomsService) {}

  private handleError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException(RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR);
  }

  @Get(':facilityId/room-types')
  // Permission tam tat: @Permissions(PermissionEnum.ROOM_TYPE_VIEW)
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
        message: RESPONSE_MESSAGES.ROOM_TYPES.GET_BY_FACILITY_SUCCESS,
        data: await this.roomsService.findRoomTypesByFacilityId(facilityId, query),
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}
