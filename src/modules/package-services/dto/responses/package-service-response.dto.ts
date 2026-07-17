import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PackageServiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  packageId: string;

  @ApiProperty()
  serviceId: string;

  @ApiProperty()
  includedQuantity: number;

  @ApiProperty()
  isRequired: number;

  @ApiProperty()
  isOptional: number;

  @ApiProperty()
  allowedFacilityScope: string;

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

  @ApiPropertyOptional({ type: [String] })
  facilityIds?: string[];
}
