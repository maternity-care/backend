import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceTypeLookupResponseDto } from '../../../service-types/dto/responses/service-type-response.dto';

export class PackageServiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  packageId: string;

  @ApiPropertyOptional({ nullable: true })
  packageStageId?: string | null;

  @ApiProperty()
  facilityServiceId: string;

  @ApiProperty()
  includedQuantity: number;

  @ApiProperty()
  isRequired: number;

  @ApiProperty()
  isOptional: number;

  @ApiProperty()
  allowedFacilityScope: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  packageCode?: string;

  @ApiPropertyOptional()
  packageName?: string;

  @ApiPropertyOptional()
  packagePrice?: string;

  @ApiPropertyOptional()
  packageStatus?: string;

  @ApiPropertyOptional({ nullable: true })
  stageName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  stageType?: string | null;

  @ApiPropertyOptional()
  serviceCode?: string;

  @ApiPropertyOptional()
  serviceName?: string;

  @ApiPropertyOptional({ nullable: true })
  serviceDescription?: string | null;

  @ApiPropertyOptional()
  serviceTypeId?: string;

  @ApiPropertyOptional({ type: ServiceTypeLookupResponseDto })
  serviceType?: ServiceTypeLookupResponseDto;

  @ApiPropertyOptional()
  serviceBasePrice?: string;

  @ApiPropertyOptional({ type: [String] })
  facilityIds?: string[];
}
