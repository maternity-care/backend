import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { trimText } from '../helpers/dto-transform.helper';

export class SuspendResourceDto {
  @ApiPropertyOptional({
    nullable: true,
    example: '2026-08-20T17:00:00+07:00',
    description: 'Thoi diem du kien tu mo lai. Null/khong gui nghia la tam ngung vo thoi han.',
  })
  @IsOptional()
  @IsDateString()
  inactiveUntil?: string | null;

  @ApiPropertyOptional({
    example: 'Bao tri co so',
    description: 'Ly do tam ngung de quan ly/FE hien thi.',
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string | null;
}
