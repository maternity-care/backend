import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMimeType, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePresignedUploadDto {
  @ApiProperty({ example: 'pregnancy-report.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsMimeType()
  mimeType: string;

  @ApiProperty({ example: 102400 })
  @IsInt()
  @Min(1)
  @Max(104857600)
  size: number;
}

export class CreateManagementPresignedUploadDto extends CreatePresignedUploadDto {
  @ApiProperty({ example: 'articles/cover-images' })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty({ required: false, example: 'report' })
  @IsString()
  @IsOptional()
  baseName?: string;
}
