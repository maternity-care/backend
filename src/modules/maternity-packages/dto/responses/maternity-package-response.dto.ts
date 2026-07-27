import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ActiveStatus,
  FacilityStatus,
  MaternityPackageStatus,
} from '../../../../common/constants/status.enum';
import { PaginationMetaResponseDto } from '../../../../common/dto/pagination-response.dto';
import { ServiceSaleMode } from '../../../services/dto/requests/create-service.dto';
import { ServiceTypeLookupResponseDto } from '../../../service-types/dto/responses/service-type-response.dto';
import {
  MaternityPackageType,
  MaternityPackageStageType,
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

  @ApiPropertyOptional({ nullable: true })
  packageStageId?: string | null;

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

  @ApiPropertyOptional({ type: [String] })
  facilityIds?: string[];

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  price: string;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty({ enum: ActiveStatus })
  facilityServiceStatus: ActiveStatus;

  @ApiProperty()
  serviceCode: string;

  @ApiProperty()
  serviceName: string;

  @ApiPropertyOptional({ nullable: true })
  serviceDescription?: string | null;

  @ApiProperty()
  serviceTypeId: string;

  @ApiProperty({ type: ServiceTypeLookupResponseDto })
  serviceType: ServiceTypeLookupResponseDto;

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

export class PackageStageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  packageId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: MaternityPackageStageType })
  stageType: MaternityPackageStageType | string;

  @ApiPropertyOptional({ nullable: true })
  weekFrom?: number | null;

  @ApiPropertyOptional({ nullable: true })
  weekTo?: number | null;

  @ApiPropertyOptional({ nullable: true })
  goal?: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ type: [PackageServiceItemResponseDto] })
  services: PackageServiceItemResponseDto[];
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

  @ApiPropertyOptional({ type: [PackageStageResponseDto] })
  stages?: PackageStageResponseDto[];
}

export class MaternityPackagePaginatedResponseDto extends PaginationMetaResponseDto {
  @ApiProperty({ type: [MaternityPackageResponseDto] })
  items: MaternityPackageResponseDto[];
}
