import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsMimeType, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { trimText } from '../../../../common/helpers/dto-transform.helper';

const BIGINT_ID_PATTERN = /^[1-9]\d*$/;

export class RegisterPendingMedicalFileDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(BIGINT_ID_PATTERN, { message: 'appointmentId phai la so nguyen duong' })
  appointmentId: string;

  @ApiPropertyOptional({ example: 'ultrasound' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(50)
  fileType?: string | null;

  @ApiProperty({ example: 'appointment-1-ultrasound.jpg' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ example: 'https://example.com/medical-helper/1/file.jpg' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(500)
  fileUrl: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsMimeType()
  mimeType: string;

  @ApiPropertyOptional({ example: 'C:/scanner/appointment-1/file.jpg' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(500)
  sourcePath?: string | null;
}

export class ListPendingMedicalFilesDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(BIGINT_ID_PATTERN, { message: 'appointmentId phai la so nguyen duong' })
  appointmentId: string;
}
