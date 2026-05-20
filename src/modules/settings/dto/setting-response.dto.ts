import { ApiProperty } from '@nestjs/swagger';

export class SettingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  value: unknown;

  @ApiProperty()
  group: string;

  @ApiProperty()
  isPublic: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
