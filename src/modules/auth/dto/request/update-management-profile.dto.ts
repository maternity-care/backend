import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateManagementProfileDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(150)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @Matches(/^(?:\+84|0)[35789]\d{8}$/, {
    message: 'phone phải là số điện thoại di động Việt Nam hợp lệ.',
  })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  personalEmail?: string;
}
