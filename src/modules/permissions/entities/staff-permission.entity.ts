import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StaffPermissionEffectEnum {
  ALLOW = 'allow',
  DENY = 'deny',
}

@Entity('staff_permissions')
export class StaffPermission {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'staff_id', type: 'bigint' })
  staffId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'permission_id', type: 'bigint' })
  permissionId: string;

  @ApiProperty({ enum: StaffPermissionEffectEnum, enumName: 'StaffPermissionEffectEnum' })
  @Column({ name: 'effect', type: 'enum', enum: StaffPermissionEffectEnum })
  effect: StaffPermissionEffectEnum;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
