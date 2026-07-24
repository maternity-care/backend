import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorShiftStatus } from '../../../common/constants/status.enum';
import { Role } from '../../roles/entities/role.entity';
import { Facility } from '../../facilities/entities/facility.entity';
import { Room } from '../../rooms/entities/room.entity';
import { Staff } from '../../staffs/entities/staff.entity';
import { ShiftSlot } from '../../../database/entities/shift-slot.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shifts')
@Index('idx_shifts_staff_date', ['staffId', 'shiftDate'])
@Index('idx_shifts_facility_date', ['facilityId', 'shiftDate'])
@Index('idx_shifts_room_date', ['roomId', 'shiftDate'])
@Index('idx_shifts_slot_id', ['slotId'])
@Index('idx_shifts_role_id', ['roleId'])
@Index('idx_shifts_status', ['status'])
export class Shift {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @ApiProperty({ type: () => Room })
  @ManyToOne(() => Room, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiPropertyOptional({ type: () => ShiftSlot, nullable: true, required: false })
  @ManyToOne(() => ShiftSlot, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'slot_id' })
  slot: ShiftSlot | null;

  @ApiPropertyOptional({ type: () => Role, nullable: true, required: false })
  @ManyToOne(() => Role, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'role_id' })
  role: Role | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'slot_id', type: 'bigint', nullable: true })
  slotId: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'staff_id', type: 'bigint' })
  staffId: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'role_id', type: 'bigint', nullable: true })
  roleId: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'room_id', type: 'bigint', nullable: true })
  roomId: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'shift_date', type: 'date' })
  shiftDate: string;

  @ApiProperty({ type: String })
  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @ApiProperty({ type: String })
  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @ApiPropertyOptional({ type: Number, nullable: true, required: false })
  @Column({ name: 'max_appointments', type: 'int', nullable: true })
  maxAppointments: number | null;

  @ApiProperty({ enum: DoctorShiftStatus, enumName: 'DoctorShiftStatus' })
  @Column({ name: 'status', type: 'enum', enum: DoctorShiftStatus })
  status: DoctorShiftStatus;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'deleted_by', type: 'bigint', nullable: true })
  deletedBy: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'deleted_reason', type: 'text', nullable: true })
  deletedReason: string | null;

  get doctorId(): string {
    return this.staffId;
  }

  set doctorId(value: string) {
    this.staffId = value;
  }
}

export { Shift as DoctorShift };
