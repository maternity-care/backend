import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatConversation } from './chat-conversation.entity';

@Entity('chat_messages')
export class ChatMessage {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'conversation_id', type: 'bigint' })
  conversationId: string;

  @ManyToOne(() => ChatConversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ChatConversation;

  @ApiProperty({ type: String })
  @Column({ name: 'sender_id', type: 'bigint' })
  senderId: string;

  @ApiProperty({ type: String, example: 'user or staff' })
  @Column({ name: 'sender_type', type: 'varchar', length: 255 })
  senderType: 'user' | 'staff';

  @ApiProperty({ type: String, example: 'text or file or image or video or audio' })
  @Column({ name: 'message_type', type: 'varchar', length: 255, default: 'text' })
  messageType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'content', type: 'text', nullable: true })
  content: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string | null;

  @ApiProperty({ type: Date })
  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
