import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ForumModerationAction } from '../../../../common/constants/forum.enum';

export class ModerateForumContentDto {
  @ApiProperty({
    enum: [
      ForumModerationAction.APPROVE,
      ForumModerationAction.HIDE,
      ForumModerationAction.REJECT,
      ForumModerationAction.DELETE,
      ForumModerationAction.LOCK_COMMENTS,
      ForumModerationAction.UNLOCK_COMMENTS,
      ForumModerationAction.PIN,
      ForumModerationAction.UNPIN,
      ForumModerationAction.FEATURE,
      ForumModerationAction.UNFEATURE,
    ],
    example: ForumModerationAction.APPROVE,
  })
  @IsEnum(ForumModerationAction)
  action: ForumModerationAction;

  @ApiPropertyOptional({ type: String, example: 'Nội dung phù hợp sau khi kiểm duyệt.' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  reason?: string | null;
}

export class ResolveContentReportDto {
  @ApiProperty({
    enum: [
      ForumModerationAction.APPROVE,
      ForumModerationAction.HIDE,
      ForumModerationAction.REJECT,
      ForumModerationAction.DELETE,
      ForumModerationAction.WARN_USER,
      ForumModerationAction.BAN_USER,
    ],
    example: ForumModerationAction.HIDE,
  })
  @IsEnum(ForumModerationAction)
  action: ForumModerationAction;

  @ApiPropertyOptional({ type: String, example: 'Đã xử lý theo chính sách cộng đồng.' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  note?: string | null;
}
