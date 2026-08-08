import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LockUserDto {
  @ApiProperty({
    description: 'Lý do khóa tài khoản',
    example: 'Tài khoản vi phạm tiêu chuẩn cộng đồng',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
