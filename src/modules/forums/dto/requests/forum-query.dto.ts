import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { ForumAuthorRole, ForumCategory } from '../../../../common/constants/forum.enum';
import { ForumContentStatus } from '../../../../common/constants/status.enum';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class ForumPostQueryDto {
  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ForumCategory, enumName: 'ForumCategory' })
  @IsOptional()
  @IsEnum(ForumCategory)
  category?: ForumCategory;

  @ApiPropertyOptional({ type: String, example: '1' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  topicId?: string;

  @ApiPropertyOptional({ type: String, example: '1' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  authorId?: string;

  @ApiPropertyOptional({ enum: ForumAuthorRole, enumName: 'ForumAuthorRole' })
  @IsOptional()
  @IsEnum(ForumAuthorRole)
  authorRole?: ForumAuthorRole;

  @ApiPropertyOptional({ type: String, example: 'thai kỳ' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ForumContentStatus, enumName: 'ForumContentStatus' })
  @IsOptional()
  @IsEnum(ForumContentStatus)
  status?: ForumContentStatus;
}

export class ForumReportQueryDto {
  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
