import { ApiProperty } from '@nestjs/swagger';
import { RoleResponseDto } from '../../../roles/dto/response/role-response.dto';
import { PermissionResponseDto } from '../../../permissions/dto/response/permission-response.dto';

export class UserPermissionOverrideResponseDto {
  @ApiProperty({ type: PermissionResponseDto })
  permission: PermissionResponseDto;

  @ApiProperty({ enum: ['allow', 'deny'] })
  effect: 'allow' | 'deny';
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  status: number;

  @ApiProperty({ type: [RoleResponseDto] })
  roles: RoleResponseDto[];

  @ApiProperty({ type: [UserPermissionOverrideResponseDto] })
  permissionOverrides: UserPermissionOverrideResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
