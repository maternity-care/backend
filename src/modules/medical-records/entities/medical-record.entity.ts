import { PregnancyProfile } from '../../pregnancy-profile/entities/pregnancy-profile.entity';
import { Staff } from '../../staffs/entities/staff.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { AppointmentServiceItem } from '../../appointments/entities/appointment-service-item.entity';
import { MedicalFile } from '../../../database/entities/medical-file.entity';

@Entity('medical_records')
export class MedicalRecord {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Appointment })
  @ManyToOne(() => Appointment, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @ApiPropertyOptional({ type: () => AppointmentServiceItem, nullable: true })
  @ManyToOne(() => AppointmentServiceItem, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'appointment_service_item_id' })
  appointmentServiceItem: AppointmentServiceItem | null;

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

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'appointment_service_item_id', type: 'bigint', nullable: true })
  appointmentServiceItemId: string | null;

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
  @Column({ name: 'conclusion', type: 'text', nullable: true })
  conclusion: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'recommendation', type: 'text', nullable: true })
  recommendation: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true, required: false })
  @Column({ name: 'next_appointment_suggested_at', type: 'timestamp', nullable: true })
  nextAppointmentSuggestedAt: Date | null;

  @OneToMany(() => MedicalFile, (file) => file.medicalRecord, { nullable: true })
  files: MedicalFile[];

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
