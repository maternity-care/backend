import { User } from './../../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../../users/dto/response/user-response.dto';
import { SafeStaffDto } from './safe-staff.dto';

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto | User | SafeStaffDto;
}
