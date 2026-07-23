import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PregnancyProfileStatus, RiskLevel } from 'src/common/constants/status.enum';
import { User } from 'src/modules/users/entities/user.entity';
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

@Entity('pregnancy_profiles')
export class PregnancyProfile {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'patient_id' })
  user: User;

  @ApiProperty({ type: String })
  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ type: String })
  @Column({ name: 'last_menstrual_period', type: 'date' })
  lastMenstrualPeriod: string;

  @ApiProperty({ type: String })
  @Column({ name: 'expected_due_date', type: 'date' })
  expectedDueDate: string;

  @ApiProperty({ type: Number })
  @Column({ name: 'fetal_count', type: 'int' })
  fetalCount: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'gravida', type: 'int' })
  gravida: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'para_full_term', type: 'int' })
  paraFullTerm: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'para_premature', type: 'int' })
  paraPremature: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'para_abortion', type: 'int' })
  paraAbortion: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'para_living_children', type: 'int' })
  paraLivingChildren: number;

  @ApiProperty({ enum: RiskLevel, enumName: 'RiskLevel' })
  @Column({ name: 'risk_level', type: 'enum', enum: RiskLevel })
  riskLevel: RiskLevel;

  @ApiProperty({ enum: PregnancyProfileStatus, enumName: 'PregnancyProfileStatus' })
  @Column({
    name: 'status',
    type: 'enum',
    enum: PregnancyProfileStatus,
    default: PregnancyProfileStatus.ACTIVE,
  })
  status: PregnancyProfileStatus;

  @ApiProperty({ type: String })
  @Column({ name: 'notes', type: 'text' })
  notes: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ApiProperty({ type: String })
  @Column({ name: 'created_by', type: 'bigint' })
  createdBy: string;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ type: String })
  @Column({ name: 'deleted_by', type: 'bigint' })
  deletedBy: string;

  @ApiProperty({ type: String })
  @Column({ name: 'deleted_reason', type: 'text' })
  deletedReason: string;
}
