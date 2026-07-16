import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DoctorShiftStatus } from '../../../common/constants/status.enum';

@Entity('doctor_shifts')
export class DoctorShift {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'doctor_id', type: 'bigint' })
  doctorId: string;

  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @Column({ name: 'room_id', type: 'bigint', nullable: true })
  roomId: string | null;

  @Column({ name: 'shift_date', type: 'date' })
  shiftDate: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ name: 'max_appointments', type: 'int', nullable: true })
  maxAppointments: number | null;

  @Column({ type: 'varchar', length: 30 })
  status: DoctorShiftStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'bigint', nullable: true })
  deletedBy: string | null;

  @Column({ name: 'delete_reason', type: 'varchar', length: 500, nullable: true })
  deleteReason: string | null;

}
