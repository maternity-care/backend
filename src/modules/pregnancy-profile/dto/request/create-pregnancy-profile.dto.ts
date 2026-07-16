import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsInt, IsIn, Min, Max } from 'class-validator';

export class CreatePregnancyProfileDto {
  @ApiPropertyOptional({ description: 'Ngày kinh cuối' })
  @IsDateString()
  @IsOptional()
  lastMenstrualPeriod: string;

  @ApiPropertyOptional({ description: 'Ngày dự sinh' })
  @IsDateString()
  @IsOptional()
  expectedDueDate: string;

  @ApiPropertyOptional({ description: 'Số thai nhi hiện tại' })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(10)
  fetalCount?: number;

  @ApiProperty({ description: 'Số lần mang thai' })
  @IsInt()
  @Min(0)
  @Max(100)
  gravida: number;

  @ApiPropertyOptional({ description: 'Số lần sinh đủ tháng' })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  paraFullTerm: number;

  @ApiPropertyOptional({ description: 'Số lần sinh non' })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  paraPremature: number;

  @ApiPropertyOptional({ description: 'Số lần sẩy / lưu / nạo hút' })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  paraAbortion: number;

  @ApiPropertyOptional({ description: 'Số con hiện sống' })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  paraLivingChildren: number;

  @ApiProperty({ description: 'Mức độ rủi ro', enum: ['low', 'medium', 'high'] })
  @IsString()
  @IsIn(['low', 'medium', 'high'])
  riskLevel: string;

  @ApiProperty({ description: 'Trạng thái', enum: ['ACTIVE', 'COMPLETED', 'TERMINATED'] })
  @IsString()
  @IsIn(['ACTIVE', 'COMPLETED', 'TERMINATED'])
  status: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  notes?: string;
}
