import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FacilityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  province: string;

  @ApiProperty()
  district: string;

  @ApiProperty()
  ward: string;

  @ApiPropertyOptional()
  latitude?: string;

  @ApiPropertyOptional()
  longitude?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
