import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UpdateFacilityOperatingHoursDto } from './update-facility-operating-hours.dto';

export enum OperatingHoursSlotStrategy {
  STRICT = 'strict',
  DEACTIVATE_INVALID_SLOTS = 'deactivate_invalid_slots',
}

export class ApplyFacilityOperatingHoursDto extends UpdateFacilityOperatingHoursDto {
  @ApiPropertyOptional({
    enum: OperatingHoursSlotStrategy,
    default: OperatingHoursSlotStrategy.STRICT,
    description: 'Cách xử lý các khung ca đang hoạt động nhưng không còn phù hợp với giờ mở cửa mới',
  })
  @IsOptional()
  @IsEnum(OperatingHoursSlotStrategy)
  slotStrategy?: OperatingHoursSlotStrategy = OperatingHoursSlotStrategy.STRICT;
}
