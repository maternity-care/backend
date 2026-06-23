import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { UserPermission } from './user-permission.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  name: string;

  @Column({ name: 'guard_name', type: 'varchar', length: 50, default: 'api' })
  guardName: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @OneToMany(() => UserPermission, (permissionOverride) => permissionOverride.permission)
  userOverrides: UserPermission[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
