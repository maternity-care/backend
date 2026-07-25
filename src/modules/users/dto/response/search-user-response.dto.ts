import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../entities/user.entity';

export class SearchUserResponseDto {
  @ApiProperty()
  users: User[];

  @ApiProperty()
  total: number;
}
