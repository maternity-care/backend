import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';

export class UpdateRoomDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  roomType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  floor?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsEnum(ActiveStatus)
  @IsOptional()
  status?: ActiveStatus;
}
