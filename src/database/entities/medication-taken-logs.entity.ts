import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('medication_taken_logs')
export class MedicationTakenLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'prescription_item_id', type: 'bigint' })
  prescriptionItemId: string;

  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @Column({ name: 'taken_at', type: 'timestamp' })
  takenAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

}
