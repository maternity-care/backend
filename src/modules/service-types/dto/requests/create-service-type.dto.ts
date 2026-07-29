import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';

export class CreateServiceTypeDto {
  @ApiProperty({ example: 'Siêu âm' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Nhóm các dịch vụ siêu âm thai', nullable: true })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus = ActiveStatus.ACTIVE;
}
