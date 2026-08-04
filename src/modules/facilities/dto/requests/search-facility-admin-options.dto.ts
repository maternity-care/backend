import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AccountStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';

export class SearchFacilityAdminOptionsDto {
  @ApiPropertyOptional({
    description: 'Tìm theo tên, email, personalEmail, số điện thoại hoặc mã nhân viên admin',
    example: 'nguyen',
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: AccountStatus,
    description: 'Trạng thái tài khoản admin. Mặc định chỉ lấy admin đang active để assign vào cơ sở.',
    example: AccountStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @ApiPropertyOptional({
    description: 'Nếu true thì chỉ lấy admin chưa là owner của cơ sở nào',
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  availableOnly?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
