import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ActiveStatus,
  AvailabilityStatus,
  FacilityStatus,
} from '../../../../common/constants/status.enum';
import { PaginationMetaResponseDto } from '../../../../common/dto/pagination-response.dto';
import { ServiceSaleMode, ServiceType } from '../../../services/dto/requests/create-service.dto';

export class FacilityServiceFacilityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  province?: string;

  @ApiPropertyOptional()
  ward?: string;

  @ApiPropertyOptional({ enum: FacilityStatus })
  status?: FacilityStatus | string;
}

export class FacilityServiceBaseServiceResponseDto {
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
  basePrice: string;

  @ApiProperty()
  defaultDurationMinutes: number;

  @ApiProperty()
  requiresDoctorWarning: boolean | number;

  @ApiProperty({ enum: ActiveStatus })
  status: ActiveStatus;
}

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

  @ApiProperty({ type: FacilityServiceFacilityResponseDto })
  facility: FacilityServiceFacilityResponseDto;

  @ApiProperty({ type: FacilityServiceBaseServiceResponseDto })
  service: FacilityServiceBaseServiceResponseDto;
}

export class FacilityServicePaginatedResponseDto extends PaginationMetaResponseDto {
  @ApiProperty({ type: [FacilityServiceResponseDto] })
  items: FacilityServiceResponseDto[];
}
