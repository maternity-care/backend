import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import {
  NotificationReferenceType,
  NotificationType,
} from '../../../common/constants/notification.enum';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsEnum(NotificationReferenceType)
  referenceType?: NotificationReferenceType;

  @IsOptional()
  @IsString()
  referenceId?: string;
}
