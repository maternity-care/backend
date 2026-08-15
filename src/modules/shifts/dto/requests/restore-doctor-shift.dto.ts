import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RestoreDoctorShiftDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
