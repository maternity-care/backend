import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { MaternityPackageStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { MaternityPackageType } from './create-maternity-package.dto';
import { MATERNITY_PACKAGE_CONSTANT } from '../../../../common/constants/maternity-package.constant';

export class SearchMaternityPackageDto {
  @ApiPropertyOptional({ description: 'Tìm theo mã, tên hoặc mô tả gói' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString({ message: MATERNITY_PACKAGE_CONSTANT.SEARCH_TOO_LONG })
  @MaxLength(100, { message: MATERNITY_PACKAGE_CONSTANT.SEARCH_TOO_LONG })
  search?: string;

  @ApiPropertyOptional({ enum: MaternityPackageStatus })
  @IsOptional()
  @IsEnum(MaternityPackageStatus, { message: MATERNITY_PACKAGE_CONSTANT.STATUS_INVALID })
  status?: MaternityPackageStatus;

  @ApiPropertyOptional({ enum: MaternityPackageType, description: 'Lọc theo loại gói dịch vụ' })
  @IsOptional()
  @IsEnum(MaternityPackageType, { message: MATERNITY_PACKAGE_CONSTANT.TYPE_INVALID })
  packageType?: MaternityPackageType;

  @ApiPropertyOptional({ example: '1', description: 'Lọc gói theo cơ sở quản lý' })
  @IsOptional()
  @IsString({ message: MATERNITY_PACKAGE_CONSTANT.FACILITY_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: MATERNITY_PACKAGE_CONSTANT.FACILITY_ID_INVALID })
  facilityId?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: MATERNITY_PACKAGE_CONSTANT.PAGE_INVALID })
  @Min(1, { message: MATERNITY_PACKAGE_CONSTANT.PAGE_INVALID })
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: MATERNITY_PACKAGE_CONSTANT.LIMIT_INVALID })
  @Min(1, { message: MATERNITY_PACKAGE_CONSTANT.LIMIT_INVALID })
  @Max(200, { message: MATERNITY_PACKAGE_CONSTANT.LIMIT_INVALID })
  limit?: number;
}
