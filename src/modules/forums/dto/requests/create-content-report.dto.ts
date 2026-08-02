import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length, Matches } from 'class-validator';
import { ForumTargetType } from '../../../../common/constants/forum.enum';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class CreateContentReportDto {
  @ApiProperty({ enum: ForumTargetType, enumName: 'ForumTargetType' })
  @IsEnum(ForumTargetType)
  targetType: ForumTargetType;

  @ApiProperty({ type: String, example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  targetId: string;

  @ApiProperty({ type: String, example: 'Nội dung quảng cáo thuốc không rõ nguồn gốc.' })
  @IsString()
  @Length(5, 2000)
  reason: string;
}
