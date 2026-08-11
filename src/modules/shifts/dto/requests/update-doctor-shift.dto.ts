import { OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';
import { CreateDoctorShiftDto } from './create-doctor-shift.dto';

export class UpdateDoctorShiftDto extends PartialType(
  OmitType(CreateDoctorShiftDto, ['status'] as const),
) {
  @IsOptional()
  @IsEnum(DoctorShiftStatus)
  status?: DoctorShiftStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}
