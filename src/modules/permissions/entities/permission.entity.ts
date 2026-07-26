import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StaffPermission } from './staff-permission.entity';

@Entity('permissions')
export class Permission {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @OneToMany(() => StaffPermission, (staffPermission) => staffPermission.permission)
  staffPermissions: StaffPermission[];

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 150, unique: true })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'guard_name', type: 'varchar', length: 50, default: 'api' })
  guardName: string;

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
