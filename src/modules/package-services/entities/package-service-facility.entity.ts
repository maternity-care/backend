import { Facility } from '../../facilities/entities/facility.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PackageItem } from './package-item.entity';

@Entity('package_service_facilities')
@Index('uq_package_service_facility', ['packageItemId', 'facilityId'], { unique: true })
@Index('idx_package_service_facilities_facility_id', ['facilityId'])
export class PackageServiceFacility {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'package_item_id', type: 'bigint' })
  packageItemId: string;

  @ManyToOne(() => PackageItem, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_item_id' })
  packageItem: PackageItem;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ManyToOne(() => Facility, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
