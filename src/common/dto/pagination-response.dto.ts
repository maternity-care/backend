import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO metadata phân trang dùng chung cho các API list.
 * Các DTO response cụ thể sẽ extend class này và khai báo thêm `items` đúng type.
 */
export class PaginationMetaResponseDto {
  @ApiProperty({ example: 42, description: 'Tổng số record phù hợp với filter' })
  total: number;

  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  page: number;

  @ApiProperty({ example: 20, description: 'Số record tối đa mỗi trang' })
  limit: number;

  @ApiProperty({ example: 3, description: 'Tổng số trang' })
  totalPages: number;
}
