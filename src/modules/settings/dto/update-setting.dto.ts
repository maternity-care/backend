import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class UpsertSettingDto {
  @ApiProperty({ example: 'site_info' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: {
      name: 'Maternity Care',
      hotline: '1900 0000',
    },
  })
  @IsObject()
  value: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'general' })
  @IsString()
  @IsOptional()
  group?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateSettingDto {
  @ApiProperty({
    example: {
      name: 'Maternity Care',
      hotline: '1900 0000',
    },
  })
  @IsObject()
  value: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'general' })
  @IsString()
  @IsOptional()
  group?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
