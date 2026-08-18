import { IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class SendMessagingMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  attachmentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  attachmentMimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(104857600)
  attachmentSize?: number;
}
