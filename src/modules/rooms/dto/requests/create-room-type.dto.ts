import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';

export class CreateRoomTypeDto {
  @ApiProperty({ example: 'Phòng khám thai' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Phòng dùng cho các lịch khám thai định kỳ' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiProperty({ enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  @IsEnum(ActiveStatus)
  status: ActiveStatus = ActiveStatus.ACTIVE;
}
