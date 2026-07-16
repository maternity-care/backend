import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsInt, IsIn, Min, IsEnum } from 'class-validator';
import { PregnancyProfileStatus } from 'src/common/constants/status.enum';

export class UpdatePregnancyProfileDto {
  @ApiPropertyOptional({ description: 'Ngày kinh cuối' })
  @IsDateString()
  @IsOptional()
  lastMenstrualPeriod?: string;

  @ApiPropertyOptional({ description: 'Ngày dự sinh' })
  @IsDateString()
  @IsOptional()
  expectedDueDate?: string;

  @ApiPropertyOptional({ description: 'Số thai nhi hiện tại' })
  @IsInt()
  @IsOptional()
  @Min(1)
  fetalCount?: number;

  @ApiPropertyOptional({ description: 'Số lần mang thai' })
  @IsInt()
  @IsOptional()
  @Min(0)
  gravida?: number;

  @ApiPropertyOptional({ description: 'Số lần sinh đủ tháng' })
  @IsInt()
  @IsOptional()
  @Min(0)
  paraFullTerm?: number;

  @ApiPropertyOptional({ description: 'Số lần sinh non' })
  @IsInt()
  @IsOptional()
  @Min(0)
  paraPremature?: number;

  @ApiPropertyOptional({ description: 'Số lần sẩy / lưu / nạo hút' })
  @IsInt()
  @IsOptional()
  @Min(0)
  paraAbortion?: number;

  @ApiPropertyOptional({ description: 'Số con hiện sống' })
  @IsInt()
  @IsOptional()
  @Min(0)
  paraLivingChildren?: number;

  @ApiPropertyOptional({ description: 'Mức độ rủi ro', enum: ['low', 'medium', 'high'] })
  @IsString()
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  riskLevel?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái',
    enum: [
      PregnancyProfileStatus.ACTIVE,
      PregnancyProfileStatus.COMPLETED,
      PregnancyProfileStatus.TERMINATED,
    ],
  })
  @IsString()
  @IsOptional()
  @IsEnum([
    // không cho cặp nhật sang trạng thái deleted
    PregnancyProfileStatus.ACTIVE,
    PregnancyProfileStatus.COMPLETED,
    PregnancyProfileStatus.TERMINATED,
  ])
  status?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  notes?: string;
}
