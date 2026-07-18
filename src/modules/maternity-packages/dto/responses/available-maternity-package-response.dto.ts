import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaternityPackageStatus } from '../../../../common/constants/status.enum';

export class AvailableMaternityPackageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

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

  @ApiProperty()
  facilityId: string;
  

  @ApiProperty()
  totalServiceCount: number;

  @ApiProperty()
  availableServiceCount: number;
}
