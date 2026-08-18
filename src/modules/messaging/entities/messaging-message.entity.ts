import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  MessagingMessageDirection,
  MessagingMessageType,
  MessagingSenderType,
} from '../types/messaging.enums';
import { MessagingConversation } from './messaging-conversation.entity';

@Entity('messaging_messages')
export class MessagingMessage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'conversation_id', type: 'bigint' })
  conversationId: string;

  @ManyToOne(() => MessagingConversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: MessagingConversation;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId: string;

  @Column({ name: 'external_message_id', type: 'varchar', length: 191, nullable: true })
  externalMessageId: string | null;

  @Column({ name: 'direction', type: 'varchar', length: 50 })
  direction: MessagingMessageDirection;

  @Column({ name: 'sender_type', type: 'varchar', length: 50 })
  senderType: MessagingSenderType;

  @Column({ name: 'sender_id', type: 'varchar', length: 191, nullable: true })
  senderId: string | null;

  @Column({ name: 'sender_name', type: 'varchar', length: 255, nullable: true })
  senderName: string | null;

  @Column({ name: 'message_type', type: 'varchar', length: 50, default: MessagingMessageType.TEXT })
  messageType: MessagingMessageType;

  @Column({ name: 'content', type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
