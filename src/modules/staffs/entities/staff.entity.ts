import { StaffPermission } from './../../permissions/entities/staff-permission.entity';
import { AccountStatus } from './../../../common/constants/status.enum';
import { Role } from './../../roles/entities/role.entity';
import { Facility } from './../../facilities/entities/facility.entity';
import { Doctor } from './../../doctors/entities/doctor.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('staffs')
export class Staff {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Doctor, required: false })
  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT', nullable: true })
  doctor: Doctor | null;

  @ApiProperty({ type: () => Role, isArray: true })
  @ManyToMany(() => Role)
  @JoinTable({
    name: 'staff_roles',
    joinColumn: { name: 'staff_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'avatar', type: 'varchar', length: 255, nullable: true })
  avatar: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'personal_email', type: 'varchar', length: 191, unique: true })
  personalEmail: string;

  @ApiProperty({ type: String })
  @Column({ name: 'employee_code', type: 'varchar', length: 50, unique: true })
  employeeCode: string;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint', nullable: true })
  facilityId: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'email', type: 'varchar', length: 191, unique: true })
  email: string;

  @ApiProperty({ type: String })
  @Column({ name: 'phone', type: 'varchar', length: 20, unique: true })
  phone: string;

  @ApiProperty({ type: String })
  @Column({ name: 'password', type: 'varchar', length: 255 })
  password: string;

  @ApiProperty({ type: String })
  @Column({ name: 'address', type: 'varchar', length: 255 })
  address: string;

  @ApiProperty({ enum: AccountStatus, enumName: 'AccountStatus' })
  @Column({ name: 'status', type: 'enum', enum: AccountStatus })
  status: AccountStatus;

  @ApiProperty({ type: StaffPermission, isArray: true })
  @OneToMany(() => StaffPermission, (permission) => permission.staff)
  permissions: StaffPermission[];

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}

// Alias tam thoi de cac module cu dang import StaffProfile khong bi loi sau khi doi bang ve staffs.
export { Staff as StaffProfile };
