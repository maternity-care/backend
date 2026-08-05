import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';

export class UpdateDoctorDto {
  @ApiProperty()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  staffId: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => trimText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => trimText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  personalEmail: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => trimText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  phone: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => trimText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  address: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => trimText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  licenseNo: string;

  @ApiPropertyOptional({ example: 'BS. CKI' })
  @Transform(({ value }) => trimText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ example: 'Sản phụ khoa' })
  @Transform(({ value }) => trimText(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  specialty: string;

  @ApiPropertyOptional({ description: 'level năm kinh nghiệm' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  yearsOfExperience: number;

  @ApiPropertyOptional({ description: 'loại phòng làm việc' })
  @IsOptional()
  workingRoomTypeId: string;

  @ApiPropertyOptional({ example: 'Bác sĩ chuyên về sản phụ khoa', nullable: true })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(5000)
  bio?: string;

  @ApiPropertyOptional({ enum: ActiveStatus, example: ActiveStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status: ActiveStatus;
}
