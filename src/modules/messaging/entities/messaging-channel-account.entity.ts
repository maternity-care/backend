import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  MessagingAccountStatus,
  MessagingChannel,
  MessagingImportFormat,
} from '../types/messaging.enums';
import { MessagingConversation } from './messaging-conversation.entity';

@Entity('messaging_channel_accounts')
export class MessagingChannelAccount {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'channel', type: 'varchar', length: 50 })
  channel: MessagingChannel;

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string;

  @Column({ name: 'external_account_id', type: 'varchar', length: 120, nullable: true })
  externalAccountId: string | null;

  @Column({ name: 'status', type: 'varchar', length: 50, default: MessagingAccountStatus.DISCONNECTED })
  status: MessagingAccountStatus;

  @Column({ name: 'auto_start', type: 'tinyint', width: 1, default: 0 })
  autoStart: boolean;

  @Column({ name: 'proxy_url', type: 'varchar', length: 500, nullable: true })
  proxyUrl: string | null;

  @Column({ name: 'credentials', type: 'json', nullable: true })
  credentials: Record<string, unknown> | null;

  @Column({ name: 'credential_format', type: 'varchar', length: 80, nullable: true })
  credentialFormat: MessagingImportFormat | string | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'last_connected_at', type: 'timestamp', nullable: true })
  lastConnectedAt: Date | null;

  @OneToMany(() => MessagingConversation, (conversation) => conversation.account)
  conversations: MessagingConversation[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
