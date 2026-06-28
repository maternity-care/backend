import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PatientExtraServiceStatus } from '../../common/constants/status.enum';

@Entity('patient_extra_services')
export class PatientExtraService {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @Column({ name: 'patient_package_id', type: 'bigint', nullable: true })
  patientPackageId: string;

  @Column({ name: 'service_id', type: 'bigint' })
  serviceId: string;

  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: string;

  @Column({ type: 'varchar', length: 30 })
  status: PatientExtraServiceStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
