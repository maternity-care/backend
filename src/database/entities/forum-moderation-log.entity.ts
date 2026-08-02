import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import {
  ForumAuthorRole,
  ForumModerationAction,
  ForumTargetType,
} from '../../common/constants/forum.enum';

@Entity('forum_moderation_logs')
export class ForumModerationLog {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ enum: ForumTargetType, enumName: 'ForumTargetType' })
  @Column({ name: 'target_type', type: 'enum', enum: ForumTargetType })
  targetType: ForumTargetType;

  @ApiProperty({ type: String })
  @Column({ name: 'target_id', type: 'bigint' })
  targetId: string;

  @ApiProperty({ enum: ForumModerationAction, enumName: 'ForumModerationAction' })
  @Column({ name: 'action', type: 'enum', enum: ForumModerationAction })
  action: ForumModerationAction;

  @ApiProperty({ type: String })
  @Column({ name: 'actor_id', type: 'bigint' })
  actorId: string;

  @ApiProperty({ enum: ForumAuthorRole, enumName: 'ForumAuthorRole' })
  @Column({ name: 'actor_role', type: 'varchar', length: 50 })
  actorRole: ForumAuthorRole;

  @ApiProperty({ type: String, required: false })
  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string | null;

  @ApiProperty({ type: Object, required: false })
  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
