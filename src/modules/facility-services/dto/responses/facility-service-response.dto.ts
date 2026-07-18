import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AvailabilityStatus } from '../../../../common/constants/status.enum';

export class FacilityServiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  serviceId: string;

  @ApiProperty()
  price: string;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty({ enum: AvailabilityStatus })
  status: AvailabilityStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  facilityCode?: string;

  @ApiPropertyOptional()
  facilityName?: string;

  @ApiPropertyOptional()
  facilityAddress?: string;

  @ApiPropertyOptional()
  facilityProvince?: string;

  @ApiPropertyOptional()
  facilityDistrict?: string;

  @ApiPropertyOptional()
  serviceCode?: string;

  @ApiPropertyOptional()
  serviceName?: string;

  @ApiPropertyOptional({ nullable: true })
  serviceDescription?: string | null;

  @ApiPropertyOptional()
  serviceType?: string;

  @ApiPropertyOptional()
  serviceBasePrice?: string;

  @ApiPropertyOptional()
  serviceDefaultDurationMinutes?: number;

  @ApiPropertyOptional()
  serviceRequiresDoctorWarning?: number;
}
