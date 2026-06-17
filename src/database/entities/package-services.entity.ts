import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('package_services')
export class PackageService {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'package_id', type: 'bigint' })
  packageId: string;

  @Column({ name: 'service_id', type: 'bigint' })
  serviceId: string;

  @Column({ name: 'included_quantity', type: 'int' })
  includedQuantity: number;

  @Column({ name: 'is_required', type: 'boolean' })
  isRequired: number;

  @Column({ name: 'is_optional', type: 'boolean' })
  isOptional: number;

  @Column({ name: 'allowed_facility_scope', type: 'varchar', length: 30 })
  allowedFacilityScope: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
