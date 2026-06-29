import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';

export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  facilityId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomType: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  floor?: string;

  @ApiProperty({ enum: ActiveStatus })
  @IsEnum(ActiveStatus)
  @IsNotEmpty()
  status: ActiveStatus;
}
