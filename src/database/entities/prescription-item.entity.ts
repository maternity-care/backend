import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Prescription } from './prescription.entity';

@Entity('prescription_items')
export class PrescriptionItem {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Prescription })
  @ManyToOne(() => Prescription, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'prescription_id' })
  prescription: Prescription;

  @ApiProperty({ type: String })
  @Column({ name: 'prescription_id', type: 'bigint' })
  prescriptionId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'medicine_name', type: 'varchar', length: 255 })
  medicineName: string;

  @ApiProperty({ type: String })
  @Column({ name: 'dosage', type: 'varchar', length: 255 })
  dosage: string;

  @ApiProperty({ type: String })
  @Column({ name: 'frequency', type: 'varchar', length: 255 })
  frequency: string;

  @ApiProperty({ type: String })
  @Column({ name: 'duration', type: 'varchar', length: 255 })
  duration: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'instructions', type: 'text', nullable: true })
  instructions: string | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
