import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  MinLength,
  Validate,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(12, 12)
  cccd: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsPhoneNumber('VN')
  @IsOptional()
  phone: string;

  @ApiPropertyOptional()
  @IsString()
  @Validate((value?: string) => {
    if (
      value &&
      new Date(value).getTime() + 15 * 365 * 24 * 60 * 60 * 1000 > new Date().getTime()
    ) {
    }
    return false;
  })
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;
}
