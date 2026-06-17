import {
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('facility_staff')
export class FacilityStaff {
  @PrimaryColumn({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @PrimaryColumn({ name: 'staff_id', type: 'bigint' })
  staffId: string;

  @Column({ type: 'varchar', length: 30 })
  status: string;

  @Column({ name: 'assigned_at', type: 'timestamp' })
  assignedAt: Date;

}
