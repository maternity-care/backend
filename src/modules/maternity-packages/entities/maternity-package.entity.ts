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
import { MaternityPackageStatus } from 'src/common/constants/status.enum';
import { Facility } from 'src/database/entities';

@Entity('maternity_packages')
export class MaternityPackage {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: String })
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'description', type: 'text' })
  description: string;

  @ApiProperty({ type: String })
  @Column({ name: 'price', type: 'decimal', precision: 15, scale: 2 })
  price: string;

  @ApiProperty({ type: Number })
  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'priority_level', type: 'int' })
  priorityLevel: number;

  @ApiProperty({ enum: MaternityPackageStatus, enumName: 'MaternityPackageStatus' })
  @Column({ name: 'status', type: 'enum', enum: MaternityPackageStatus })
  status: MaternityPackageStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
