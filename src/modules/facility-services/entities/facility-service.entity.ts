import { PackageItem } from './../../package-services/entities/package-item.entity';
import { Service } from './../../services/entities/service.entity';
import { Facility } from './../../facilities/entities/facility.entity';
import { ActiveStatus, AvailabilityStatus } from './../../../common/constants/status.enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('facility_services')
export class FacilityService {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ManyToOne(() => Facility, (facility) => facility.facilityServices, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: String })
  @Column({ name: 'service_id', type: 'bigint' })
  serviceId: string;

  @ManyToOne(() => Service, (service) => service.facilityServices, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @ApiProperty({ type: String })
  @Column({ name: 'price', type: 'decimal', precision: 15, scale: 2 })
  price: string;

  @ApiProperty({ type: Number })
  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @ApiProperty({ enum: ActiveStatus, enumName: 'ActiveStatus' })
  @Column({ name: 'status', type: 'enum', enum: ActiveStatus })
  status: ActiveStatus | AvailabilityStatus;

  @ApiProperty({ type: PackageItem, isArray: true })
  @OneToMany(() => PackageItem, (packageItem) => packageItem.facilityService)
  packageItems: PackageItem[];

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
