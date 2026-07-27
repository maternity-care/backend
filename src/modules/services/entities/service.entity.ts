import { FacilityService } from './../../facility-services/entities/facility-service.entity';
import { ActiveStatus } from './../../../common/constants/status.enum';
import { ApiProperty } from '@nestjs/swagger';
import { ServiceSaleMode } from '../dto/requests/create-service.dto';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('services')
export class Service {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @OneToMany(() => FacilityService, (facilityService) => facilityService.service)
  facilityServices: FacilityService[];

  @ApiProperty({ type: String })
  @Column({ name: 'description', type: 'text' })
  description: string;

  @ApiProperty({ type: String })
  @Column({ name: 'service_type', type: 'varchar', length: 255 })
  serviceType: string;

  @ApiProperty({ enum: ServiceSaleMode, enumName: 'ServiceSaleMode' })
  @Column({
    name: 'sale_mode',
    type: 'enum',
    enum: ServiceSaleMode,
    default: ServiceSaleMode.BOTH,
  })
  saleMode: ServiceSaleMode;

  @ApiProperty({ type: Number })
  @Column({ name: 'default_duration_minutes', type: 'int' })
  defaultDurationMinutes: number;

  @ApiProperty({ type: String })
  @Column({ name: 'base_price', type: 'decimal', precision: 15, scale: 2 })
  basePrice: string;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'requires_doctor_warning', type: 'boolean' })
  requiresDoctorWarning: boolean;

  @ApiProperty({ enum: ActiveStatus, enumName: 'ActiveStatus' })
  @Column({ name: 'status', type: 'enum', enum: ActiveStatus })
  status: ActiveStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
