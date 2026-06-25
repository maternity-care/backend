import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class SearchUserResponseDto {
  @ApiProperty()
  users: UserResponseDto[];

  @ApiProperty()
  total: number;
}
