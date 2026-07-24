import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { BulkCreateDoctorShiftDto } from './bulk-create-doctor-shift.dto';

export class AutoGenerateShiftsDto extends BulkCreateDoctorShiftDto {
  @ApiPropertyOptional({
    default: true,
    description: 'Neu true, confirm chi luu cac ca hop le va bo qua ca bi conflict/ngay dong cua.',
  })
  @IsOptional()
  @IsBoolean()
  saveOnlyValid?: boolean = true;
}
