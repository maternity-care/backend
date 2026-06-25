import {
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('facility_doctors')
export class FacilityDoctor {
  @PrimaryColumn({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @PrimaryColumn({ name: 'doctor_id', type: 'bigint' })
  doctorId: string;

  @Column({ type: 'varchar', length: 30 })
  status: string;

  @Column({ name: 'assigned_at', type: 'timestamp' })
  assignedAt: Date;

}
