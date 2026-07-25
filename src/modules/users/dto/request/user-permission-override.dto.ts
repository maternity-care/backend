import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UserPermissionOverrideDto {
  @ApiProperty()
  @IsString()
  permissionId: string;

  @ApiProperty({ enum: ['allow', 'deny'] })
  @IsIn(['allow', 'deny'])
  effect: 'allow' | 'deny';
}
