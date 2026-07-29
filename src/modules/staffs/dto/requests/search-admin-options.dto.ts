import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountStatus } from '../../../../common/constants/status.enum';

export class SearchAdminOptionsDto {
  @ApiPropertyOptional({
    description: 'Từ khóa tìm theo tên, email, số điện thoại hoặc mã nhân viên admin',
    example: 'nguyen',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: AccountStatus,
    description: 'Trạng thái tài khoản admin. Mặc định chỉ lấy active để gán vào cơ sở.',
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

  @ApiPropertyOptional({ description: 'Trang hiện tại', example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Số bản ghi mỗi trang', example: 20 })
  @IsOptional()
  limit?: number;
}
