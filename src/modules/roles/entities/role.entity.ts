import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission } from 'src/modules/permissions/entities/permission.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('roles')
export class Role {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Permission, isArray: true })
  @ManyToMany(() => Permission)
  permissions: Permission[];

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 100, unique: true })
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
