import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ImportZaloAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  proxyUrl?: string;

  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;
}
