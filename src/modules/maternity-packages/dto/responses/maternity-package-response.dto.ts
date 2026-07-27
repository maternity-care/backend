import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ActiveStatus,
  AvailabilityStatus,
  FacilityStatus,
  MaternityPackageStatus,
} from '../../../../common/constants/status.enum';
import { PaginationMetaResponseDto } from '../../../../common/dto/pagination-response.dto';
import { ServiceSaleMode, ServiceType } from '../../../services/dto/requests/create-service.dto';
import {
  MaternityPackageType,
} from '../requests/create-maternity-package.dto';

export class PackageFacilityResponseDto {
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

export class PackageServiceItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  packageId: string;

  @ApiProperty()
  facilityServiceId: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  serviceId: string;

  @ApiProperty()
  includedQuantity: number;

  @ApiProperty()
  isRequired: boolean | number;

  @ApiProperty()
  isOptional: boolean | number;

  @ApiProperty()
  allowedFacilityScope: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  price: string;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty({ enum: AvailabilityStatus })
  facilityServiceStatus: AvailabilityStatus;

  @ApiProperty()
  serviceCode: string;

  @ApiProperty()
  serviceName: string;

  @ApiPropertyOptional({ nullable: true })
  serviceDescription?: string | null;

  @ApiProperty({ enum: ServiceType })
  serviceType: ServiceType | string;

  @ApiProperty({ enum: ServiceSaleMode })
  serviceSaleMode: ServiceSaleMode | string;

  @ApiProperty()
  serviceBasePrice: string;

  @ApiProperty()
  serviceDefaultDurationMinutes: number;

  @ApiProperty()
  serviceRequiresDoctorWarning: boolean | number;

  @ApiProperty({ enum: ActiveStatus })
  serviceStatus: ActiveStatus;
}

export class MaternityPackageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ enum: MaternityPackageType })
  packageType: MaternityPackageType | string;

  @ApiProperty()
  price: string;

  @ApiPropertyOptional({ nullable: true })
  durationDays?: number | null;

  @ApiProperty()
  priorityLevel: number;

  @ApiProperty({ enum: MaternityPackageStatus })
  status: MaternityPackageStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: PackageFacilityResponseDto })
  facility: PackageFacilityResponseDto;

  @ApiProperty({ type: [PackageServiceItemResponseDto] })
  services: PackageServiceItemResponseDto[];
}

export class MaternityPackagePaginatedResponseDto extends PaginationMetaResponseDto {
  @ApiProperty({ type: [MaternityPackageResponseDto] })
  items: MaternityPackageResponseDto[];
}
