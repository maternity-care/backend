import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'conversation_id', type: 'bigint' })
  conversationId: string;

  @Column({ name: 'sender_id', type: 'bigint', nullable: true })
  senderId: string;

  @Column({ name: 'sender_type', type: 'varchar', length: 30 })
  senderType: string;

  @Column({ name: 'message_type', type: 'varchar', length: 30 })
  messageType: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

}
