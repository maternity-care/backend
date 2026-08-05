import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ForumContentStatus } from '../../../../common/constants/status.enum';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class CreateManagementForumPostDto {
  @ApiProperty({ type: String, example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  topicId: string;

  @ApiProperty({ type: String, example: 'Những dấu hiệu cần đi khám trong tam cá nguyệt đầu' })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({ type: String, example: '<p>Nội dung bài viết...</p>' })
  @IsString()
  @Length(10, 20000)
  content: string;

  @ApiPropertyOptional({ type: String, example: 'https://cdn.example.com/forum-cover.jpg' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  coverImageUrl?: string | null;

  @ApiPropertyOptional({ enum: ForumContentStatus, enumName: 'ForumContentStatus' })
  @IsOptional()
  @IsEnum(ForumContentStatus)
  status?: ForumContentStatus;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  commentable?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ type: String, example: 'Bài viết được tạo từ màn quản lý.' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  moderationReason?: string | null;
}

export class UpdateManagementForumPostDto {
  @ApiPropertyOptional({ type: String, example: '1' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  topicId?: string;

  @ApiPropertyOptional({ type: String, example: 'Những dấu hiệu cần đi khám trong tam cá nguyệt đầu' })
  @IsOptional()
  @IsString()
  @Length(5, 255)
  title?: string;

  @ApiPropertyOptional({ type: String, example: '<p>Nội dung bài viết...</p>' })
  @IsOptional()
  @IsString()
  @Length(10, 20000)
  content?: string;

  @ApiPropertyOptional({ type: String, example: 'https://cdn.example.com/forum-cover.jpg' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  coverImageUrl?: string | null;

  @ApiPropertyOptional({ enum: ForumContentStatus, enumName: 'ForumContentStatus' })
  @IsOptional()
  @IsEnum(ForumContentStatus)
  status?: ForumContentStatus;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  commentable?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ type: String, example: 'Cập nhật bài viết từ màn quản lý.' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  moderationReason?: string | null;
}
