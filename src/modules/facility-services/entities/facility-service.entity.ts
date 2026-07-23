import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActiveStatus } from 'src/common/constants/status.enum';

@Entity('facility_services')
export class FacilityService {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'service_id', type: 'bigint' })
  serviceId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'price', type: 'decimal', precision: 15, scale: 2 })
  price: string;

  @ApiProperty({ type: Number })
  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

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
