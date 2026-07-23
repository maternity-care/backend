import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
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

  @ApiProperty({ type: String })
  @Column({ name: 'facility_service_id', type: 'bigint' })
  facilityServiceId: string;

  @ApiProperty({ type: Number })
  @Column({ name: 'included_quantity', type: 'int' })
  includedQuantity: number;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'is_required', type: 'boolean' })
  isRequired: boolean;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'is_optional', type: 'boolean' })
  isOptional: boolean;

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
