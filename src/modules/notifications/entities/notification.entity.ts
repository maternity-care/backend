import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationReferenceType,
  NotificationType,
} from 'src/common/constants/notification.enum';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'reference', type: 'varchar', length: 255 })
  reference: string;

  @ApiProperty({ type: String })
  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @ApiProperty({ enum: NotificationType, enumName: 'NotificationType' })
  @Column({ name: 'type', type: 'enum', enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ type: String })
  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ type: String })
  @Column({ name: 'content', type: 'text' })
  content: string;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'is_read', type: 'boolean' })
  isRead: boolean;

  @ApiProperty({ enum: NotificationReferenceType, enumName: 'NotificationReferenceType' })
  @Column({ name: 'reference_type', type: 'enum', enum: NotificationReferenceType })
  referenceType: NotificationReferenceType;

  @ApiProperty({ type: String })
  @Column({ name: 'reference_id', type: 'bigint' })
  referenceId: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
