import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '../../../../common/constants/status.enum';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ nullable: true })
  cccd: string | null;

  @ApiProperty({ nullable: true })
  dateOfBirth: string | null;

  @ApiProperty({ nullable: true })
  address: string | null;

  @ApiProperty({ nullable: true })
  province: string | null;

  @ApiProperty({ nullable: true })
  ward: string | null;

  @ApiProperty({ nullable: true })
  emergencyContactName: string | null;

  @ApiProperty({ nullable: true })
  emergencyContactPhone: string | null;

  @ApiProperty({ enum: AccountStatus })
  status: AccountStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
