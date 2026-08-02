import { ContentReportStatus } from './../../common/constants/status.enum';
import { ForumModerationAction, ForumTargetType } from './../../common/constants/forum.enum';
import { Staff } from './../../modules/staffs/entities/staff.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum ReportRole {
  USER = 'USER',
  STAFF = 'STAFF',
}

@Entity('content_reports')
export class ContentReport {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Staff, required: false })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'handler_id' })
  handler: Staff | null;

  @ApiProperty({ type: String, required: false })
  @Column({ name: 'handler_id', type: 'bigint', nullable: true })
  handlerId: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'reporter_id', type: 'bigint' })
  reporterId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'reporter_role', type: 'enum', enum: ReportRole, enumName: 'ReportRole' })
  reporterRole: ReportRole;

  @ApiProperty({ enum: ForumTargetType, enumName: 'ForumTargetType' })
  @Column({ name: 'target_type', type: 'enum', enum: ForumTargetType })
  targetType: ForumTargetType;

  @ApiProperty({ type: String })
  @Column({ name: 'target_id', type: 'bigint' })
  targetId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @ApiProperty({ type: String, required: false })
  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string | null;

  @ApiProperty({ enum: ForumModerationAction, enumName: 'ForumModerationAction', required: false })
  @Column({ name: 'resolution_action', type: 'varchar', length: 50, nullable: true })
  resolutionAction: ForumModerationAction | null;

  @ApiProperty({ enum: ContentReportStatus, enumName: 'ContentReportStatus' })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ContentReportStatus,
    default: ContentReportStatus.PENDING,
  })
  status: ContentReportStatus;

  @ApiProperty({ type: String })
  @Column({ name: 'resolved_by', type: 'bigint', nullable: true })
  resolvedBy: string | null;

  @ApiProperty({ type: Date })
  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
