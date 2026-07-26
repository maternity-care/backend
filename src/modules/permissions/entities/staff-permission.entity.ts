import { Staff } from './../../staffs/entities/staff.entity';
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
import { Permission } from './permission.entity';

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

  @ManyToOne(() => Staff, (staff) => staff.permissions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @ApiProperty({ type: String })
  @Column({ name: 'permission_id', type: 'bigint' })
  permissionId: string;

  @ManyToOne(() => Permission, (permission) => permission.staffPermissions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

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

// Alias tam thoi de cac module cu dang import theo ten user-permission khong bi loi khoi tao module.
export { StaffPermission as UserPermission };
