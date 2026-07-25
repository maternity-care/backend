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
  @Column({ name: 'email', type: 'varchar', length: 191, unique: true })
  email: string;

  @ApiProperty({ type: String })
  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string;

  @ApiProperty({ type: String })
  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address: string;

  @ApiProperty({ type: String })
  @Column({ name: 'province', type: 'varchar', length: 255, nullable: true })
  province: string;

  @ApiProperty({ type: String })
  @Column({ name: 'ward', type: 'varchar', length: 255, nullable: true })
  ward: string;

  @ApiProperty({ enum: UserStatusEnum, enumName: 'UserStatusEnum' })
  @Column({ name: 'status', type: 'enum', enum: UserStatusEnum, default: UserStatusEnum.ACTIVE })
  status: UserStatusEnum;

  @ApiProperty({ type: String })
  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 255, nullable: true })
  emergencyContactName: string;

  @ApiProperty({ type: String })
  @Column({ name: 'emergency_contact_phone', type: 'varchar', length: 20, nullable: true })
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
