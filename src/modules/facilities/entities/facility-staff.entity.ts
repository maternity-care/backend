import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { ActiveStatus } from '../../../common/constants/status.enum';

@Entity('facility_staff')
export class FacilityStaff {
  @PrimaryColumn({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @PrimaryColumn({ name: 'staff_id', type: 'bigint' })
  staffId: string;

  @PrimaryColumn({ name: 'role_id', type: 'bigint' })
  roleId: string;

  @ManyToOne(() => Role, { eager: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'varchar', length: 30 })
  status: ActiveStatus;

  @Column({ name: 'assigned_at', type: 'timestamp' })
  assignedAt: Date;

}
