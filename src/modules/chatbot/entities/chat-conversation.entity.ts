import { ConversationStatus } from '../../../common/constants/status.enum';
import { Staff } from '../../staffs/entities/staff.entity';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
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
import { ChatMessage } from './chat-message.entity';

@Entity('chat_conversations')
export class ChatConversation {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Staff | null;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @ApiProperty({ type: String })
  @Column({ name: 'doctor_id', type: 'bigint', nullable: true })
  doctorId: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint', nullable: true })
  facilityId: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @ApiProperty({ type: String, required: false })
  @Column({ name: 'guest_key', type: 'varchar', length: 120, nullable: true })
  guestKey: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'conversation_type', type: 'varchar', length: 255, default: 'chatting' })
  conversationType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'chatbot_status', type: 'varchar', length: 50, default: 'bot' })
  chatbotStatus: string;

  @ApiProperty({ type: String, required: false })
  @Column({ name: 'assigned_staff_id', type: 'varchar', length: 50, nullable: true })
  assignedStaffId: string | null;

  @ApiProperty({ type: String, required: false })
  @Column({ name: 'assigned_staff_name', type: 'varchar', length: 255, nullable: true })
  assignedStaffName: string | null;

  @ApiProperty({ type: Date, required: false })
  @Column({ name: 'claim_expires_at', type: 'timestamp', nullable: true })
  claimExpiresAt: Date | null;

  @ApiProperty({ type: Object, required: false })
  @Column({ name: 'requester_metadata', type: 'json', nullable: true })
  requesterMetadata: Record<string, unknown> | null;

  @ApiProperty({ type: Number })
  @Column({ name: 'priority', type: 'int', default: 0 })
  priority: number;

  @ApiProperty({ enum: ConversationStatus, enumName: 'ConversationStatus' })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.OPEN,
  })
  status: ConversationStatus;

  @ApiProperty({ type: () => [ChatMessage] })
  @OneToMany(() => ChatMessage, (message) => message.conversation)
  messages: ChatMessage[];

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
