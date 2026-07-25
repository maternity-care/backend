import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  @Length(6)
  otp: string;
}
