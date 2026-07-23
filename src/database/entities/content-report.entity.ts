import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Staff } from 'src/modules/staffs/entities/staff.entity';
import { ContentReportStatus } from 'src/common/constants/status.enum';

export enum ReportRole {
  USER = 'USER',
  STAFF = 'STAFF',
}

@Entity('content_reports')
export class ContentReport {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: false })
  handler: Staff;

  @ApiProperty({ type: String })
  @Column({ name: 'reporter_id', type: 'bigint' })
  reporterId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'reporter_role', type: 'enum', enum: ReportRole, enumName: 'ReportRole' })
  reporterRole: ReportRole;

  @ApiProperty({ type: String })
  @Column({ name: 'target_type', type: 'varchar', length: 255 })
  targetType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'target_id', type: 'bigint' })
  targetId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @ApiProperty({ enum: ContentReportStatus, enumName: 'ContentReportStatus' })
  @Column({ name: 'status', type: 'enum', enum: ContentReportStatus })
  status: ContentReportStatus;

  @ApiProperty({ type: String })
  @Column({ name: 'resolved_by', type: 'bigint' })
  resolvedBy: string;

  @ApiProperty({ type: Date })
  @Column({ name: 'resolved_at', type: 'timestamp' })
  resolvedAt: Date;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
