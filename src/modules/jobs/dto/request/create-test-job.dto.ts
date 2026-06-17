import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateTestJobDto {
  @ApiProperty({ example: 'hello' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: {}, required: false })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
