import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PrescriptionItem } from './prescription-item.entity';

@Entity('medication_taken_logs')
export class MedicationTakenLog {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => PrescriptionItem })
  @ManyToOne(() => PrescriptionItem, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'prescription_item_id' })
  prescriptionItem: PrescriptionItem;

  @ApiProperty({ type: String })
  @Column({ name: 'prescription_item_id', type: 'bigint' })
  prescriptionItemId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @ApiProperty({ type: Date })
  @Column({ name: 'taken_at', type: 'timestamp' })
  takenAt: Date;

  @ApiProperty({ type: String })
  @Column({ name: 'note', type: 'text' })
  note: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
