import { BadRequestException, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications of the authenticated account' })
  async findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = this.parseOptionalLimit(limit);
    return { data: await this.notificationsService.findMine(user, parsedLimit) };
  }

  private parseOptionalLimit(limit?: string): number | undefined {
    if (limit === undefined || limit === '') return undefined;
    const parsed = Number(limit);
    if (!Number.isInteger(parsed)) {
      throw new BadRequestException('limit must be an integer');
    }
    return parsed;
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { data: { count: await this.notificationsService.countUnreadMine(user) } };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.notificationsService.markAllReadMine(user) };
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { data: await this.notificationsService.markReadMine(id, user) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { data: await this.notificationsService.removeMine(id, user) };
  }
}
