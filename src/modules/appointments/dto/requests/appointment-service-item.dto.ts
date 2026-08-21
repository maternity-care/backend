import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const BIGINT_ID_PATTERN = /^[1-9]\d*$/;

export class CreateAppointmentServiceItemDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(BIGINT_ID_PATTERN)
  serviceId: string;

  @ApiProperty({ description: 'Staff id của bác sĩ chuyên khoa đang trực thực hiện chỉ định' })
  @IsString()
  @Matches(BIGINT_ID_PATTERN)
  doctorId: string;

  @ApiProperty({ description: 'Phòng thực hiện dịch vụ được điều phối khi bác sĩ chỉ định' })
  @IsString()
  @Matches(BIGINT_ID_PATTERN)
  roomId: string;

  @ApiPropertyOptional({ example: 'Ưu tiên siêu âm trước xét nghiệm.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class AddAppointmentServiceItemsDto {
  @ApiProperty({ type: [CreateAppointmentServiceItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateAppointmentServiceItemDto)
  items: CreateAppointmentServiceItemDto[];
}

export class CheckInAppointmentServiceItemDto {
  @ApiPropertyOptional({ description: 'Staff id của bác sĩ chuyên khoa check-in nếu cần đổi' })
  @IsOptional()
  @IsString()
  @Matches(BIGINT_ID_PATTERN)
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Phòng thực hiện nếu cần đổi' })
  @IsOptional()
  @IsString()
  @Matches(BIGINT_ID_PATTERN)
  roomId?: string;
}

export class SetServiceResultExpectedAtDto {
  @ApiProperty({ example: '2026-08-21T09:30:00.000Z' })
  @IsDateString()
  resultExpectedAt: string;
}
