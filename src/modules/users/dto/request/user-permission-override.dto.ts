import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { UserPermissionEffect } from '../../../permissions/entities/user-permission.entity';

export class UserPermissionOverrideDto {
  @ApiProperty()
  @IsString()
  permissionId: string;

  @ApiProperty({ enum: ['allow', 'deny'] })
  @IsIn(['allow', 'deny'])
  effect: UserPermissionEffect;
}
