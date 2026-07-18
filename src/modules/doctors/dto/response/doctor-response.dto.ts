import { StaffProfile } from './../../../staffs/entities/staff-profiles.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../../../common/constants/status.enum';

export class DoctorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  staffId: string;

  @ApiProperty()
  licenseNo: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  specialty: string;

  @ApiProperty()
  yearsOfExperience: number;

  @ApiPropertyOptional({ nullable: true })
  bio?: string;

  @ApiProperty({ enum: ActiveStatus })
  status: ActiveStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  staff: StaffProfile;
}
