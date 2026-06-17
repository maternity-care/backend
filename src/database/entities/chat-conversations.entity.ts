import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('chat_conversations')
export class ChatConversation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'facility_id', type: 'bigint', nullable: true })
  facilityId: string;

  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @Column({ name: 'assigned_user_id', type: 'bigint', nullable: true })
  assignedUserId: string;

  @Column({ name: 'conversation_type', type: 'varchar', length: 30 })
  conversationType: string;

  @Column({ type: 'int' })
  priority: number;

  @Column({ type: 'varchar', length: 30 })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
