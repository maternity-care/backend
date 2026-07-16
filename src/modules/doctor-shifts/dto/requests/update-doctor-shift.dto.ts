import { OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';
import { CreateDoctorShiftDto } from './create-doctor-shift.dto';

export class UpdateDoctorShiftDto extends PartialType(
  OmitType(CreateDoctorShiftDto, ['status'] as const),
) {
  @IsOptional()
  @IsEnum(DoctorShiftStatus)
  status?: DoctorShiftStatus;
}
