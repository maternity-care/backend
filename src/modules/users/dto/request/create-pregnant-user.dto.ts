import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePregnantUserDto {
  @ApiProperty({ description: 'Họ và tên thai phụ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Email dùng để đăng ký/đăng nhập' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Số điện thoại di động Việt Nam' })
  @Matches(/^(?:\+84|0)[35789]\d{8}$/, {
    message: 'phone phải là số điện thoại di động Việt Nam hợp lệ.',
  })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string | null;

  @ApiPropertyOptional({ description: 'Số CCCD gồm 12 chữ số' })
  @IsOptional()
  @Matches(/^\d{12}$/, { message: 'cccd phải gồm đúng 12 chữ số.' })
  cccd?: string;

  @ApiPropertyOptional({ example: '1998-05-20', description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'dateOfBirth phải có định dạng YYYY-MM-DD.',
  })
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ward?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^(?:\+84|0)[35789]\d{8}$/, {
    message: 'emergencyContactPhone phải là số điện thoại di động Việt Nam hợp lệ.',
  })
  emergencyContactPhone?: string;
}
