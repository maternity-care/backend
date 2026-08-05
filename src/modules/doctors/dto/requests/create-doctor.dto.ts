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

export class CreateDoctorDto {
  @ApiProperty()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  staffId: string;

  @ApiProperty()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  licenseNo: string;

  @ApiProperty({ example: 'BS. CKI' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Sản phụ khoa' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  specialty: string;

  @ApiProperty({
    example: 5,
    minimum: 0,
    maximum: 80,
    description: 'Số năm kinh nghiệm',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  yearsOfExperience: number;

  @ApiPropertyOptional({
    description: 'id của loại phòng làm việc (room type)',
  })
  @IsOptional()
  @IsString()
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
  status?: ActiveStatus;
}
