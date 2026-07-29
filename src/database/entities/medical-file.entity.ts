import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MedicalRecord } from '../../modules/medical-records/entities/medical-record.entity';

@Entity('medical_files')
export class MedicalFile {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => MedicalRecord })
  @ManyToOne(() => MedicalRecord, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'medical_record_id' })
  medicalRecord: MedicalRecord;

  @ApiProperty({ type: String })
  @Column({ name: 'medical_record_id', type: 'bigint' })
  medicalRecordId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'file_type', type: 'varchar', length: 255, nullable: true, default: 'pdf' })
  fileType: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true, default: '' })
  fileName: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'mime_type', type: 'varchar', length: 255, nullable: true, default: '' })
  mimeType: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'uploaded_by', type: 'varchar', length: 255 })
  uploadedBy: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
