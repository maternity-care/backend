import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsAlpha,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { trimText } from '../../../common/helpers/dto-transform.helper';

/** Query đầu vào cho API tạo URL bản đồ. */
export class OpenMapQueryDto {
  // Swagger hiển thị ví dụ giúp người dùng thử API.
  @ApiProperty({ example: '10.7756' })
  // IsLatitude kiểm tra giá trị từ -90 đến 90.
  @IsLatitude()
  latitude: string;

  @ApiProperty({ example: '106.6871' })
  // IsLongitude kiểm tra giá trị từ -180 đến 180.
  @IsLongitude()
  longitude: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 19, default: 16 })
  // Client có thể bỏ zoom; khi đó dùng giá trị mặc định 16.
  @IsOptional()
  // Query string luôn là chuỗi nên cần chuyển sang number trước khi validate.
  @Type(() => Number)
  // Zoom chỉ chấp nhận số nguyên.
  @IsInt()
  @Min(1)
  @Max(19)
  zoom?: number = 16;
}

/** Query đầu vào cho API chuyển địa chỉ thành tọa độ. */
export class GeocodeAddressQueryDto {
  @ApiProperty({ example: '123 Nguyễn Thị Minh Khai, Quận 3, Hồ Chí Minh' })
  // Trim và gộp khoảng trắng trước khi chạy validator.
  @Transform(({ value }) => trimText(value))
  @IsString()
  // Tránh request quá ngắn và gần như chắc chắn không có ý nghĩa.
  @MinLength(3)
  // Giới hạn kích thước input để tránh query bất thường.
  @MaxLength(500)
  address: string;

  @ApiPropertyOptional({ example: 'vn', description: 'ISO 3166-1 alpha-2' })
  @IsOptional()
  // Chuẩn hóa VN, Vn thành vn.
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  // Country code chỉ được chứa chữ cái.
  @IsAlpha()
  // ISO alpha-2 luôn có đúng hai ký tự.
  @Length(2, 2)
  countryCode?: string;
}
