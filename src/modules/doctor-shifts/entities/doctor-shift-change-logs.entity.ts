import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('doctor_shift_change_logs')
export class DoctorShiftChangeLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'shift_id', type: 'bigint' })
  shiftId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'old_status', type: 'varchar', length: 30, nullable: true })
  oldStatus: string | null;

  @Column({ name: 'new_status', type: 'varchar', length: 30, nullable: true })
  newStatus: string | null;

  @Column({ name: 'old_doctor_id', type: 'bigint', nullable: true })
  oldDoctorId: string | null;

  @Column({ name: 'new_doctor_id', type: 'bigint', nullable: true })
  newDoctorId: string | null;

  @Column({ name: 'old_room_id', type: 'bigint', nullable: true })
  oldRoomId: string | null;

  @Column({ name: 'new_room_id', type: 'bigint', nullable: true })
  newRoomId: string | null;

  @Column({ name: 'old_start_time', type: 'time', nullable: true })
  oldStartTime: string | null;

  @Column({ name: 'new_start_time', type: 'time', nullable: true })
  newStartTime: string | null;

  @Column({ name: 'old_end_time', type: 'time', nullable: true })
  oldEndTime: string | null;

  @Column({ name: 'new_end_time', type: 'time', nullable: true })
  newEndTime: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @Column({ name: 'changed_by', type: 'bigint', nullable: true })
  changedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
