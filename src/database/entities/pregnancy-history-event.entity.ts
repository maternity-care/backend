import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PregnancyProfile } from 'src/modules/pregnancy-profile/entities/pregnancy-profile.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pregnancy_history_events')
export class PregnancyHistoryEvent {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => PregnancyProfile })
  @ManyToOne(() => PregnancyProfile, { onDelete: 'RESTRICT', nullable: false })
  pregnancyProfile: PregnancyProfile;

  @ApiProperty({ type: String })
  @Column({ name: 'pregnancy_profile_id', type: 'bigint' })
  pregnancyProfileId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'event_type', type: 'varchar', length: 255 })
  eventType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'event_date', type: 'date' })
  eventDate: string;

  @ApiProperty({ type: String })
  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'ref_table', type: 'varchar', length: 255, nullable: true })
  refTable: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'ref_id', type: 'bigint' })
  refId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'created_by', type: 'date' })
  createdBy: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
