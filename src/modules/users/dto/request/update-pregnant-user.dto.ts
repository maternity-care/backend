import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { UserStatusEnum } from '../../users.enum';

function emptyStringToUndefined(value: unknown): unknown {
  return value === '' ? undefined : value;
}

export class UpdatePregnantUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'dateOfBirth phải có định dạng YYYY-MM-DD.',
  })
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  province?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional({
    enum: UserStatusEnum,
    nullable: true,
  })
  @IsEnum(UserStatusEnum)
  @IsOptional()
  status?: UserStatusEnum | null;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsString()
  @Matches(/^(?:\+84|0)[35789]\d{8}$/, {
    message: 'emergencyContactPhone phải là số điện thoại di động Việt Nam hợp lệ.',
  })
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  emergencyContactPhone?: string;
}
