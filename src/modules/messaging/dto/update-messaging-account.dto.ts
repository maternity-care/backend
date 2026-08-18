import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMessagingAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  proxyUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;
}
