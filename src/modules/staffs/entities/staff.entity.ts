import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from 'src/common/constants/status.enum';
import { Doctor, Facility } from 'src/database/entities';
import { Role } from 'src/modules/roles/entities/role.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
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
  roles: Role[];

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'personal_email', type: 'varchar', length: 191, unique: true })
  personalEmail: string;

  @ApiProperty({ type: String })
  @Column({ name: 'employee_code', type: 'varchar', length: 50, unique: true })
  employeeCode: string;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

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

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
