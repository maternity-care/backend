import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class CreateForumPostDto {
  @ApiProperty({ type: String, example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  topicId: string;

  @ApiProperty({ type: String, example: 'Có nên bổ sung sắt từ tuần thứ 8 không?' })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({ type: String, example: 'Mình đang ở tuần thứ 8 và muốn hỏi kinh nghiệm bổ sung sắt...' })
  @IsString()
  @Length(10, 20000)
  content: string;

  @ApiPropertyOptional({ type: String, example: 'https://cdn.example.com/forum-cover.jpg' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  coverImageUrl?: string | null;
}
