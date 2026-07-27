import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { PaginationMetaResponseDto } from '../../../../common/dto/pagination-response.dto';
import { ServiceTypeLookupResponseDto } from '../../../service-types/dto/responses/service-type-response.dto';
import { ServiceSaleMode } from '../requests/create-service.dto';

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

  @ApiProperty({ enum: ActiveStatus })
  status: ActiveStatus;
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

  @ApiProperty()
  serviceTypeId: string;

  @ApiProperty({ type: ServiceTypeLookupResponseDto })
  serviceType: ServiceTypeLookupResponseDto;

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
