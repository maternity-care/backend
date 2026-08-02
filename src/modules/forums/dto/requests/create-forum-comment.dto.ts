import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class CreateForumCommentDto {
  @ApiProperty({ type: String, example: 'Bạn nên trao đổi với bác sĩ theo dõi trước khi đổi liều.' })
  @IsString()
  @Length(1, 10000)
  content: string;

  @ApiPropertyOptional({ type: String, example: '1' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  parentId?: string | null;

  @ApiPropertyOptional({ type: String, example: 'text' })
  @IsOptional()
  @IsString()
  messageType?: string = 'text';
}
