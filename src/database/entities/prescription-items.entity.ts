import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('prescription_items')
export class PrescriptionItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'prescription_id', type: 'bigint' })
  prescriptionId: string;

  @Column({ name: 'medicine_name', type: 'varchar', length: 200 })
  medicineName: string;

  @Column({ type: 'varchar', length: 100 })
  dosage: string;

  @Column({ type: 'varchar', length: 100 })
  frequency: string;

  @Column({ type: 'varchar', length: 100 })
  duration: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  instructions: string;

}
