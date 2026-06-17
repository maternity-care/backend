import { ApiProperty } from '@nestjs/swagger';

export class PresignedUploadResponseDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  publicUrl: string;

  @ApiProperty()
  bucket: string;

  @ApiProperty({ example: 'PUT' })
  method: string;

  @ApiProperty({ example: { 'Content-Type': 'image/png' } })
  headers: Record<string, string>;

  @ApiProperty()
  expiresIn: number;
}
