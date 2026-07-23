import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Appointment } from './appointment.entity';
import { PregnancyProfile } from 'src/modules/pregnancy-profile/entities/pregnancy-profile.entity';
import { Staff } from 'src/modules/staffs/entities/staff.entity';

@Entity('medical_records')
export class MedicalRecord {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Appointment })
  @ManyToOne(() => Appointment, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Staff;

  @ApiProperty({ type: () => PregnancyProfile })
  @ManyToOne(() => PregnancyProfile, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'pregnancy_profile_id' })
  pregnancyProfile: PregnancyProfile;

  @ApiProperty({ type: String })
  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'pregnancy_profile_id', type: 'bigint' })
  pregnancyProfileId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'doctor_id', type: 'bigint' })
  doctorId: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'diagnosis', type: 'text', nullable: true })
  diagnosis: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'conclusion', type: 'text' })
  conclusion: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'recommendation', type: 'text', nullable: true })
  recommendation: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true, required: false })
  @Column({ name: 'next_appointment_suggested_at', type: 'timestamp', nullable: true })
  nextAppointmentSuggestedAt: Date | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
