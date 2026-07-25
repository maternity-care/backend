import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../../common/constants/response-message.constant';
import { trimText } from '../../../../common/helpers/dto-transform.helper';
import { SHIFT_TIME_PATTERN } from './create-doctor-shift.dto';
import { IsLaterThan } from '../../../../common/helpers/dto-validation.helper';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class CreateShiftSlotDto {
  @ApiProperty({ example: '1', description: 'Co so so huu khung ca nay' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFT_SLOTS.FACILITY_ID_INVALID })
  facilityId: string;

  @ApiProperty({ example: 'Ca sang' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '07:00' })
  @Transform(({ value }) => trimText(value))
  @Matches(SHIFT_TIME_PATTERN, { message: RESPONSE_MESSAGES.SHIFT_SLOTS.START_TIME_FORMAT_INVALID })
  startTime: string;

  @ApiProperty({ example: '12:00' })
  @Transform(({ value }) => trimText(value))
  @Matches(SHIFT_TIME_PATTERN, { message: RESPONSE_MESSAGES.SHIFT_SLOTS.END_TIME_FORMAT_INVALID })
  @IsLaterThan('startTime', { message: RESPONSE_MESSAGES.SHIFT_SLOTS.END_TIME_AFTER_START_TIME })
  endTime: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOvernight?: boolean = false;

  @ApiPropertyOptional({ enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus = ActiveStatus.ACTIVE;

}
