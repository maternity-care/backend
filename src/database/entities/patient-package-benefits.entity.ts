import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('patient_package_benefits')
export class PatientPackageBenefit {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'patient_package_id', type: 'bigint' })
  patientPackageId: string;

  @Column({ name: 'service_id', type: 'bigint' })
  serviceId: string;

  @Column({ name: 'total_quantity', type: 'int' })
  totalQuantity: number;

  @Column({ name: 'used_quantity', type: 'int', default: 0 })
  usedQuantity: number;

  @Column({ name: 'remaining_quantity', type: 'int' })
  remainingQuantity: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
