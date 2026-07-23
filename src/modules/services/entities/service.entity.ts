import { ApiProperty } from '@nestjs/swagger';
import { ActiveStatus } from 'src/common/constants/status.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
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

  @ApiProperty({ type: String })
  @Column({ name: 'description', type: 'text' })
  description: string;

  @ApiProperty({ type: String })
  @Column({ name: 'service_type', type: 'varchar', length: 255 })
  serviceType: string;

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
