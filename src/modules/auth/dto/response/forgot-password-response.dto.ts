import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordResponseDto {
  @ApiProperty({ nullable: true })
  reset_token: string | null;

  @ApiProperty({ nullable: true })
  reset_url: string | null;
}
