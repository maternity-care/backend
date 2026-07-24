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
import { trimText } from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { SHIFT_TIME_PATTERN } from './create-doctor-shift.dto';
import { IsLaterThan } from '../../../../common/helpers/dto-validation.helper';

export class CreateShiftSlotDto {
  @ApiPropertyOptional({
    example: '1',
    nullable: true,
    description: 'Bo trong/null neu la khung ca global dung chung moi co so',
  })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: 'facilityId phai la so nguyen duong' })
  facilityId?: string;

  @ApiProperty({ example: 'Ca sang' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '07:00' })
  @Transform(({ value }) => trimText(value))
  @Matches(SHIFT_TIME_PATTERN, { message: 'Giờ bắt đầu phai co dinh dang HH:mm hoac HH:mm:ss' })
  startTime: string;

  @ApiProperty({ example: '12:00' })
  @Transform(({ value }) => trimText(value))
  @Matches(SHIFT_TIME_PATTERN, { message: 'Giờ kết thúc phai co dinh dang HH:mm hoac HH:mm:ss' })
  @IsLaterThan('startTime', { message: 'endTime phai muon hon startTime' })
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
