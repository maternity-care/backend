import { Controller, Get, HttpException, InternalServerErrorException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { RoomWithDetailsResponseDto } from './dto/responses/room-with-details-response.dto';
import { SearchRooms2Dto } from './dto/requests/search-room-2';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { assertFacilityAccess } from '../../common/helpers/facility-scope.helper';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Management - Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('management/facility')

export class RoomsFacilityController {
  constructor(private readonly roomsService: RoomsService) {}

  private handleError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException(RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR);
  }


  @Get('rooms/:facilityId')
  @Permissions(PermissionEnum.ROOM_VIEW)
  @ApiOperation({ summary: 'Get rooms by facility'})
  @ApiResponse({ status : 200, description: 'Rooms found', type: [RoomWithDetailsResponseDto] })
  async findRoomsByFacility(
  @CurrentUser() user: AuthenticatedUser,
  @Param('facilityId') facilityId: string,
  // không cho facilityId optional vào đây vì facility bắt buộc
  @Query() filters: SearchRooms2Dto  ) {
    try {
      assertFacilityAccess(user, facilityId);
      const rooms = await this.roomsService.findByFacilityId(facilityId, filters);
      return {
        message: RESPONSE_MESSAGES.ROOMS.GET_BY_FACILITY_SUCCESS,
        data: rooms,
      };
    } catch (error) {
      this.handleError(error);
    }
  }


}
