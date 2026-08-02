import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ForumCategory } from '../../../../common/constants/forum.enum';
import { ActiveStatus } from '../../../../common/constants/status.enum';

export class CreateForumTopicDto {
  @ApiProperty({ type: String, example: 'Dinh dưỡng tam cá nguyệt đầu' })
  @IsString()
  @Length(3, 255)
  title: string;

  @ApiProperty({ enum: ForumCategory, enumName: 'ForumCategory' })
  @IsEnum(ForumCategory)
  category: ForumCategory;

  @ApiPropertyOptional({ type: String, example: 'Trao đổi thực đơn, vitamin và lưu ý dinh dưỡng.' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string | null;

  @ApiPropertyOptional({ enum: ActiveStatus, enumName: 'ActiveStatus' })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}
