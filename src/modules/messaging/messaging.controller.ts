import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZaloPersonalRuntimeService } from './adapters/zalo-personal-runtime.service';
import { CreateMessagingAccountDto } from './dto/create-messaging-account.dto';
import { ImportZaloAccountDto } from './dto/import-zalo-account.dto';
import { SendMessagingMessageDto } from './dto/send-message.dto';
import { UpdateMessagingAccountDto } from './dto/update-messaging-account.dto';
import { MessagingService } from './messaging.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('management/messages')
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly zaloRuntime: ZaloPersonalRuntimeService,
  ) {}

  @Get('accounts')
  @Permissions(PermissionEnum.MESSAGING_VIEW)
  listAccounts() {
    return this.messagingService.listAccounts();
  }

  @Post('accounts')
  @Permissions(PermissionEnum.MESSAGING_ACCOUNT_MANAGE)
  createAccount(@Body() dto: CreateMessagingAccountDto) {
    return this.messagingService.createAccount(dto);
  }

  @Patch('accounts/:id')
  @Permissions(PermissionEnum.MESSAGING_ACCOUNT_MANAGE)
  updateAccount(@Param('id') id: string, @Body() dto: UpdateMessagingAccountDto) {
    return this.messagingService.updateAccount(id, dto);
  }

  @Delete('accounts/:id')
  @Permissions(PermissionEnum.MESSAGING_ACCOUNT_MANAGE)
  async deleteAccount(@Param('id') id: string) {
    await this.messagingService.deleteAccount(id);
    return { deleted: true };
  }

  @Post('accounts/import/zalo')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions(PermissionEnum.MESSAGING_ACCOUNT_MANAGE)
  importZaloAccount(
    @UploadedFile() file: { buffer: Buffer; originalname?: string },
    @Body() dto: ImportZaloAccountDto,
  ) {
    return this.messagingService.importZaloAccount(file, dto);
  }

  @Post('accounts/qr/zalo')
  @Permissions(PermissionEnum.MESSAGING_ACCOUNT_MANAGE)
  startZaloQrLogin(@Body() dto: ImportZaloAccountDto) {
    return this.zaloRuntime.startQrLogin(dto);
  }

  @Post('accounts/:id/qr')
  @Permissions(PermissionEnum.MESSAGING_ACCOUNT_MANAGE)
  startZaloQrLoginForAccount(@Param('id') id: string) {
    return this.zaloRuntime.startQrLoginForAccount(id);
  }

  @Post('accounts/:id/start')
  @Permissions(PermissionEnum.MESSAGING_ACCOUNT_MANAGE)
  async startAccount(@Param('id') id: string) {
    await this.zaloRuntime.start(id);
    return { started: true };
  }

  @Post('accounts/:id/stop')
  @Permissions(PermissionEnum.MESSAGING_ACCOUNT_MANAGE)
  async stopAccount(@Param('id') id: string) {
    await this.zaloRuntime.stop(id);
    return { stopped: true };
  }

  @Get('conversations')
  @Permissions(PermissionEnum.MESSAGING_VIEW)
  listConversations(@Query('tagId') tagId?: string | string[]) {
    return this.messagingService.listConversations({
      tagIds: Array.isArray(tagId) ? tagId : tagId ? [tagId] : [],
    });
  }

  @Post('conversations/zalo-phone')
  @Permissions(PermissionEnum.MESSAGING_CREATE)
  async openZaloPhoneConversation(@Body() dto: { accountId?: string; phone?: string }) {
    const accountId = String(dto.accountId ?? '');
    const phone = String(dto.phone ?? '');
    const profile = await this.zaloRuntime.findUserByPhone(accountId, phone);
    return this.messagingService.openZaloPhoneConversation({ accountId, phone, profile });
  }

  @Get('tags')
  @Permissions(PermissionEnum.MESSAGING_VIEW)
  listTags() {
    return this.messagingService.listTags();
  }

  @Post('tags')
  @Permissions(PermissionEnum.MESSAGING_UPDATE)
  createTag(@Body() dto: { name?: string; color?: string; sortOrder?: number }) {
    return this.messagingService.createTag(dto);
  }

  @Patch('tags/:id')
  @Permissions(PermissionEnum.MESSAGING_UPDATE)
  updateTag(
    @Param('id') id: string,
    @Body() dto: { name?: string; color?: string; sortOrder?: number },
  ) {
    return this.messagingService.updateTag(id, dto);
  }

  @Delete('tags/:id')
  @Permissions(PermissionEnum.MESSAGING_UPDATE)
  async deleteTag(@Param('id') id: string) {
    await this.messagingService.deleteTag(id);
    return { deleted: true };
  }

  @Get('conversations/:id/messages')
  @Permissions(PermissionEnum.MESSAGING_VIEW)
  listMessages(@Param('id') id: string) {
    return this.messagingService.getMessages(id);
  }

  @Delete('conversations/:id')
  @Permissions(PermissionEnum.MESSAGING_UPDATE)
  async deleteConversation(@Param('id') id: string) {
    await this.messagingService.deleteConversation(id);
    return { deleted: true };
  }

  @Get('conversations/:id/customer')
  @Permissions(PermissionEnum.MESSAGING_VIEW)
  getConversationCustomer(@Param('id') id: string) {
    return this.messagingService.getConversationCustomer(id);
  }

  @Patch('conversations/:id/customer')
  @Permissions(PermissionEnum.MESSAGING_UPDATE)
  updateConversationCustomer(
    @Param('id') id: string,
    @Body() dto: { displayName?: string; phone?: string; email?: string; address?: string; userId?: string | null },
  ) {
    return this.messagingService.updateConversationCustomer(id, dto);
  }

  @Post('conversations/:id/customer/quick-user')
  @Permissions(PermissionEnum.MESSAGING_CREATE)
  quickCreateConversationUser(@Param('id') id: string) {
    return this.messagingService.quickCreateUserForConversation(id);
  }

  @Patch('conversations/:id/customer/user')
  @Permissions(PermissionEnum.MESSAGING_UPDATE)
  mapConversationUser(
    @Param('id') id: string,
    @Body() dto: { userId?: string | null },
  ) {
    return this.messagingService.mapConversationUser(id, dto.userId ? String(dto.userId) : null);
  }

  @Get('conversations/:id/appointments')
  @Permissions(PermissionEnum.MESSAGING_VIEW)
  getConversationAppointments(@Param('id') id: string) {
    return this.messagingService.getConversationAppointments(id);
  }

  @Patch('conversations/:id/assignee')
  @Permissions(PermissionEnum.MESSAGING_UPDATE)
  assignConversation(
    @Param('id') id: string,
    @Body() dto: { staffId?: string | null },
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.messagingService.assignConversation(id, dto.staffId, {
      id: user?.id,
      name: user?.name,
      email: user?.email,
    });
  }

  @Patch('conversations/:id/tags')
  @Permissions(PermissionEnum.MESSAGING_UPDATE)
  setConversationTags(
    @Param('id') id: string,
    @Body() dto: { tagIds?: string[]; tags?: string[] },
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.messagingService.setConversationTags(id, Array.isArray(dto.tagIds) ? dto.tagIds : [], {
      id: user?.id,
      name: user?.name,
      email: user?.email,
    });
  }

  @Post('conversations/:id/messages')
  @Permissions(PermissionEnum.MESSAGING_REPLY)
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: SendMessagingMessageDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const content = dto.content?.trim() ?? '';
    const attachment = dto.attachmentUrl
      ? {
          url: dto.attachmentUrl,
          name: dto.attachmentName,
          mimeType: dto.attachmentMimeType,
          size: dto.attachmentSize,
        }
      : null;
    const { conversation, message } = await this.messagingService.recordOutbound(
      conversationId,
      { id: user?.id, name: user?.name ?? user?.email },
      content,
      attachment,
    );
    try {
      const providerResponse = await this.zaloRuntime.sendMessage(
        conversation.accountId,
        conversation.externalThreadId,
        conversation.externalThreadType,
        content,
        attachment,
      );
      return this.messagingService.updateOutboundDelivery(message.id, 'sent', null, providerResponse);
    } catch (error) {
      return this.messagingService.updateOutboundDelivery(message.id, 'failed', this.getErrorMessage(error));
    }
  }

  @Post('conversations/:conversationId/messages/:messageId/retry')
  @Permissions(PermissionEnum.MESSAGING_REPLY)
  async retryMessage(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    const { conversation, message } = await this.messagingService.getOutboundMessageForRetry(
      conversationId,
      messageId,
    );
    await this.messagingService.updateOutboundDelivery(message.id, 'pending', null);
    const attachmentUrl = this.readMetadataString(message.metadata, 'attachmentUrl');
    try {
      const providerResponse = await this.zaloRuntime.sendMessage(
        conversation.accountId,
        conversation.externalThreadId,
        conversation.externalThreadType,
        message.content ?? '',
        attachmentUrl
          ? {
              url: attachmentUrl,
              name: this.readMetadataString(message.metadata, 'attachmentName'),
              mimeType: this.readMetadataString(message.metadata, 'attachmentMimeType'),
              size: this.readMetadataNumber(message.metadata, 'attachmentSize'),
            }
          : null,
      );
      return this.messagingService.updateOutboundDelivery(message.id, 'sent', null, providerResponse);
    } catch (error) {
      return this.messagingService.updateOutboundDelivery(message.id, 'failed', this.getErrorMessage(error));
    }
  }

  @Post('conversations/:conversationId/messages/:messageId/undo')
  @Permissions(PermissionEnum.MESSAGING_REPLY)
  async undoMessage(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    const { conversation, message, payload } = await this.messagingService.getOutboundMessageForUndo(
      conversationId,
      messageId,
    );
    try {
      const providerResponse = await this.zaloRuntime.undoMessage(
        conversation.accountId,
        conversation.externalThreadId,
        conversation.externalThreadType,
        payload,
      );
      return this.messagingService.markOutboundRecalled(message.id, providerResponse);
    } catch (error) {
      throw new BadRequestException(this.getErrorMessage(error));
    }
  }

  private readMetadataString(metadata: Record<string, unknown> | null, key: string): string | null {
    const value = metadata?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readMetadataNumber(metadata: Record<string, unknown> | null, key: string): number | null {
    const value = metadata?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
