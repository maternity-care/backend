import { ApiProperty } from '@nestjs/swagger';
import { ActiveStatus } from '../../../common/constants/status.enum';
import { Role } from '../../roles/entities/role.entity';
import { Staff } from '../../staffs/entities/staff.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Facility } from './facility.entity';

@Entity('facility_staff')
export class FacilityStaff {
  @ApiProperty({ type: String })
  @PrimaryColumn({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiProperty({ type: String })
  @PrimaryColumn({ name: 'staff_id', type: 'bigint' })
  staffId: string;

  @ApiProperty({ type: String })
  @PrimaryColumn({ name: 'role_id', type: 'bigint' })
  roleId: string;

  @ApiProperty({ enum: ActiveStatus })
  @Column({ name: 'status', type: 'enum', enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @ApiProperty({ type: Date })
  @Column({ name: 'assigned_at', type: 'timestamp' })
  assignedAt: Date;

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @ApiProperty({ type: () => Role })
  @ManyToOne(() => Role, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
