import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus, AvailabilityStatus } from '../../../../common/constants/status.enum';
import { PaginationMetaResponseDto } from '../../../../common/dto/pagination-response.dto';
import { ServiceSaleMode, ServiceType } from '../requests/create-service.dto';

export class ServiceFacilityAssignmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  facilityCode: string;

  @ApiProperty()
  facilityName: string;

  @ApiProperty()
  price: string;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty({ enum: AvailabilityStatus })
  status: AvailabilityStatus;
}

export class ServiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ enum: ServiceType })
  serviceType: ServiceType | string;

  @ApiProperty({ enum: ServiceSaleMode })
  saleMode: ServiceSaleMode;

  @ApiProperty()
  defaultDurationMinutes: number;

  @ApiProperty()
  basePrice: string;

  @ApiProperty()
  requiresDoctorWarning: boolean | number;

  @ApiProperty({ enum: ActiveStatus })
  status: ActiveStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [ServiceFacilityAssignmentResponseDto] })
  facilityServices?: ServiceFacilityAssignmentResponseDto[];
}

export class ServicePaginatedResponseDto extends PaginationMetaResponseDto {
  @ApiProperty({ type: [ServiceResponseDto] })
  items: ServiceResponseDto[];
}
