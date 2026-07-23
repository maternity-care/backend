import { ApiProperty } from '@nestjs/swagger';
import { Staff } from 'src/modules/staffs/entities/staff.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from 'src/modules/roles/entities/role.entity';

@Entity('staff_roles')
export class StaffRole {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @ApiProperty({ type: () => Role })
  @ManyToOne(() => Role, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ApiProperty({ type: String })
  @Column({ name: 'staff_id', type: 'bigint' })
  staffId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'role_id', type: 'bigint' })
  roleId: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
