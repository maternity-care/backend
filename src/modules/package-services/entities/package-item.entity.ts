import { FacilityService } from './../../facility-services/entities/facility-service.entity';
import { MaternityPackage } from './../../maternity-packages/entities/maternity-package.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('package_items')
export class PackageItem {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'package_id', type: 'bigint' })
  packageId: string;

  @ManyToOne(() => MaternityPackage, (item) => item.packageItems, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'package_id' })
  package: MaternityPackage;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_service_id', type: 'bigint' })
  facilityServiceId: string;

  @ManyToOne(() => FacilityService, (service) => service.packageItems, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'facility_service_id' })
  facilityService: FacilityService;

  @ApiProperty({ type: Number })
  @Column({ name: 'included_quantity', type: 'int' })
  includedQuantity: number;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'is_required', type: 'boolean' })
  isRequired: boolean | number;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'is_optional', type: 'boolean' })
  isOptional: boolean | number;

  @ApiProperty({ type: Number })
  @Column({ name: 'allowed_facility_scope', type: 'int' })
  allowedFacilityScope: number;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
