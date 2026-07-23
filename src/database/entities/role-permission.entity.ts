import { ApiProperty } from '@nestjs/swagger';
import { Permission } from 'src/modules/permissions/entities/permission.entity';
import { Role } from 'src/modules/roles/entities/role.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('role_permissions')
export class RolePermission {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Role })
  @ManyToOne(() => Role, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ApiProperty({ type: () => Permission })
  @ManyToOne(() => Permission, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  @ApiProperty({ type: String })
  @Column({ name: 'role_id', type: 'bigint' })
  roleId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'permission_id', type: 'bigint' })
  permissionId: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
