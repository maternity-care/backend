import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserStatusEnum } from '../users.enum';

@Entity('users')
export class User {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'cccd', type: 'varchar', length: 100, unique: true })
  cccd: string;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'phone', type: 'varchar', length: 20, unique: true })
  phone: string;

  @ApiProperty({ type: String })
  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: string;

  @ApiProperty({ type: String })
  @Column({ name: 'address', type: 'varchar', length: 255 })
  address: string;

  @ApiProperty({ type: String })
  @Column({ name: 'province', type: 'varchar', length: 255 })
  province: string;

  @ApiProperty({ type: String })
  @Column({ name: 'ward', type: 'varchar', length: 255 })
  ward: string;

  @ApiProperty({ enum: UserStatusEnum, enumName: 'UserStatusEnum' })
  @Column({ name: 'status', type: 'enum', enum: UserStatusEnum })
  status: UserStatusEnum;

  @ApiProperty({ type: String })
  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 255 })
  emergencyContactName: string;

  @ApiProperty({ type: String })
  @Column({ name: 'emergency_contact_phone', type: 'varchar', length: 20 })
  emergencyContactPhone: string;

  @ApiPropertyOptional({ type: Object, nullable: true, required: false })
  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
