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
import { MedicalRecord } from './medical-record.entity';
import { PrescriptionStatus } from 'src/common/constants/status.enum';
import { User } from 'src/modules/users/entities/user.entity';
import { Staff } from 'src/modules/staffs/entities/staff.entity';

@Entity('prescriptions')
export class Prescription {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Staff;

  @ApiProperty({ type: () => MedicalRecord })
  @ManyToOne(() => MedicalRecord, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'medical_record_id' })
  medicalRecord: MedicalRecord;

  @ApiProperty({ type: String })
  @Column({ name: 'medical_record_id', type: 'bigint' })
  medicalRecordId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'doctor_id', type: 'bigint' })
  doctorId: string;

  @ApiProperty({ enum: PrescriptionStatus, enumName: 'PrescriptionStatus' })
  @Column({ name: 'status', type: 'enum', enum: PrescriptionStatus })
  status: PrescriptionStatus;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
