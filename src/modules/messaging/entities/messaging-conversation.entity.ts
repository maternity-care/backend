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
import {
  MessagingChannel,
  MessagingConversationStatus,
} from '../types/messaging.enums';
import { MessagingChannelAccount } from './messaging-channel-account.entity';
import { MessagingMessage } from './messaging-message.entity';

@Entity('messaging_conversations')
export class MessagingConversation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId: string;

  @ManyToOne(() => MessagingChannelAccount, (account) => account.conversations, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'account_id' })
  account: MessagingChannelAccount;

  @Column({ name: 'channel', type: 'varchar', length: 50 })
  channel: MessagingChannel;

  @Column({ name: 'external_thread_id', type: 'varchar', length: 191 })
  externalThreadId: string;

  @Column({ name: 'external_thread_type', type: 'varchar', length: 50, default: 'user' })
  externalThreadType: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true })
  customerName: string | null;

  @Column({ name: 'customer_external_id', type: 'varchar', length: 191, nullable: true })
  customerExternalId: string | null;

  @Column({ name: 'assigned_staff_id', type: 'bigint', nullable: true })
  assignedStaffId: string | null;

  @Column({ name: 'assigned_staff_name', type: 'varchar', length: 255, nullable: true })
  assignedStaffName: string | null;

  @Column({ name: 'status', type: 'varchar', length: 50, default: MessagingConversationStatus.OPEN })
  status: MessagingConversationStatus;

  @Column({ name: 'last_message_preview', type: 'varchar', length: 500, nullable: true })
  lastMessagePreview: string | null;

  @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
  lastMessageAt: Date | null;

  @Column({ name: 'unread_count', type: 'int', default: 0 })
  unreadCount: number;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @OneToMany(() => MessagingMessage, (message) => message.conversation)
  messages: MessagingMessage[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
