import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { trimText } from '../../../../common/helpers/dto-transform.helper';

const BIGINT_ID_PATTERN = /^[1-9]\d*$/;

export class CreateMedicalRecordDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(BIGINT_ID_PATTERN, { message: 'appointmentId phải là số nguyên dương' })
  appointmentId: string;

  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(BIGINT_ID_PATTERN, { message: 'pregnancyProfileId phải là số nguyên dương' })
  pregnancyProfileId: string;

  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(BIGINT_ID_PATTERN, { message: 'doctorId phải là số nguyên dương' })
  doctorId: string;

  @ApiPropertyOptional({ nullable: true, example: 'Thai kỳ tiến triển bình thường' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(10000)
  diagnosis?: string | null;

  @ApiProperty({ example: 'Sức khỏe mẹ và thai nhi ổn định' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  conclusion: string;

  @ApiPropertyOptional({ nullable: true, example: 'Tái khám sau 4 tuần' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(10000)
  recommendation?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-08-26T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  nextAppointmentSuggestedAt?: string | null;

  @ApiPropertyOptional({
    type: () => MedicalFileDto,
    isArray: true,
    example: [
      {
        fileType: 'pdf',
        fileName: 'medical-records.pdf',
        fileUrl: 'https://example.com/medical-records.pdf',
        mimeType: 'application/pdf',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalFileDto)
  files?: MedicalFileDto[];
}

export class MedicalFileDto {
  @ApiPropertyOptional({ nullable: true, example: 'Loại file' })
  @IsOptional()
  @IsString()
  fileType?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Tên file' })
  @IsOptional()
  @IsString()
  fileName?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Url file' })
  @IsOptional()
  @IsString()
  fileUrl?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Mime type' })
  @IsOptional()
  @IsString()
  mimeType?: string | null;

  uploadedBy: string;
}
