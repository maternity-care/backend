import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Prescription } from './prescription.entity';
import { Staff } from 'src/modules/staffs/entities/staff.entity';

@Entity('prescription_histories')
export class PrescriptionHistory {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: false })
  changer: Staff;

  @ApiProperty({ type: () => Prescription })
  @ManyToOne(() => Prescription, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'prescription_id' })
  prescription: Prescription;

  @ApiProperty({ type: String })
  @Column({ name: 'prescription_id', type: 'bigint' })
  prescriptionId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'action', type: 'varchar', length: 255 })
  action: string;

  @ApiProperty({ type: Object })
  @Column({ name: 'snapshot', type: 'json' })
  snapshot: Record<string, unknown>;

  @ApiProperty({ type: String })
  @Column({ name: 'changed_by', type: 'bigint' })
  changedBy: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
