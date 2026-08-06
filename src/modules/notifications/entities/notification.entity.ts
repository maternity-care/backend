import { User } from './../../users/entities/user.entity';
import { Staff } from './../../staffs/entities/staff.entity';
import {
  NotificationType,
  NotificationReferenceType,
} from './../../../common/constants/notification.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
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

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, (user) => user.notifications, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'staff_id', type: 'bigint', nullable: true })
  staffId: string | null;

  @ManyToOne(() => Staff, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff | null;

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
