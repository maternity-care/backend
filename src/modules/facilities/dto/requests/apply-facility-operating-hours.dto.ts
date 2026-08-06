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
    description: 'Cach xu ly shift_slots active neu gio hoat dong moi lam slot khong con hop le',
  })
  @IsOptional()
  @IsEnum(OperatingHoursSlotStrategy)
  slotStrategy?: OperatingHoursSlotStrategy = OperatingHoursSlotStrategy.STRICT;
}
