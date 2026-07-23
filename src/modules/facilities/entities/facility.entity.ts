import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Staff } from 'src/database/entities';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('facilities')
export class Facility {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Staff, nullable: true })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: Staff | null;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ type: String })
  @Column({ name: 'owner_id', type: 'bigint' })
  ownerId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone: string;

  @ApiProperty({ type: String })
  @Column({ name: 'email', type: 'varchar', length: 191 })
  email: string;

  @ApiProperty({ type: String })
  @Column({ name: 'open_time', type: 'time' })
  openTime: string;

  @ApiProperty({ type: String })
  @Column({ name: 'close_time', type: 'time' })
  closeTime: string;

  @ApiProperty({ type: String })
  @Column({ name: 'working_days', type: 'varchar', length: 255 })
  workingDays: string;

  @ApiProperty({ type: String })
  @Column({ name: 'address', type: 'varchar', length: 255 })
  address: string;

  @ApiProperty({ type: String })
  @Column({ name: 'province', type: 'varchar', length: 255 })
  province: string;

  @ApiProperty({ type: String })
  @Column({ name: 'ward', type: 'varchar', length: 255 })
  ward: string;

  @ApiProperty({ type: String })
  @Column({ name: 'latitude', type: 'varchar', length: 255 })
  latitude: string;

  @ApiProperty({ type: String })
  @Column({ name: 'longitude', type: 'varchar', length: 255 })
  longitude: string;

  @ApiProperty({ type: String })
  @Column({ name: 'status', type: 'varchar', length: 50 })
  status: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'deleted_by', type: 'bigint', nullable: true })
  deletedBy: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'delete_reason', type: 'text', nullable: true })
  deleteReason: string | null;
}
