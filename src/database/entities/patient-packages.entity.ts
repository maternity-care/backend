import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PatientPackageStatus } from '../../common/constants/status.enum';

@Entity('patient_packages')
export class PatientPackage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @Column({ name: 'pregnancy_profile_id', type: 'bigint', nullable: true })
  pregnancyProfileId: string;

  @Column({ name: 'package_id', type: 'bigint' })
  packageId: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string;

  @Column({ type: 'varchar', length: 30 })
  status: PatientPackageStatus;

  @Column({ name: 'upgraded_from_id', type: 'bigint', nullable: true })
  upgradedFromId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
