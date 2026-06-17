import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('medical_files')
export class MedicalFile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'medical_record_id', type: 'bigint' })
  medicalRecordId: string;

  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId: string;

  @Column({ name: 'file_type', type: 'varchar', length: 50 })
  fileType: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'uploaded_by', type: 'bigint' })
  uploadedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

}
