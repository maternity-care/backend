import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { MessagingChannel } from '../types/messaging.enums';

export class CreateMessagingAccountDto {
  @IsIn([MessagingChannel.ZALO_PERSONAL])
  channel: MessagingChannel;

  @IsString()
  @MaxLength(255)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  proxyUrl?: string;

  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;
}
