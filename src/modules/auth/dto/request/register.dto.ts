import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Tên người dùng' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Số điện thoại' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    description: 'Số CCCD 12 số',
    example: '123456789012',
    minLength: 12,
    maxLength: 12,
  })
  @IsString()
  @IsNotEmpty()
  cccd?: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
