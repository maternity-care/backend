import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PregnancyProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  patientId: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional({ description: 'Ngày kinh cuối' })
  lastMenstrualPeriod?: string;

  @ApiPropertyOptional({ description: 'Ngày dự sinh' })
  expectedDueDate?: string;

  @ApiProperty()
  gravida: number;

  @ApiProperty({ description: 'Số lần sinh đủ tháng' })
  paraFullTerm: number;

  @ApiProperty({ description: 'Số lần sinh non' })
  paraPremature: number;

  @ApiProperty({ description: 'Số lần sẩy / lưu / nạo hút' })
  paraAbortion: number;

  @ApiProperty({ description: 'Số con hiện sống' })
  paraLivingChildren: number;

  @ApiProperty()
  riskLevel: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  createdBy?: string;

  @ApiPropertyOptional()
  deletedAt?: string;

  @ApiPropertyOptional()
  deletedBy?: string;

  @ApiPropertyOptional()
  deletedReason?: string;
}
