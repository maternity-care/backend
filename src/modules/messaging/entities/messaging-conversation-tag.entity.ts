import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { MessagingConversation } from './messaging-conversation.entity';
import { MessagingTag } from './messaging-tag.entity';

@Entity('messaging_conversation_tags')
export class MessagingConversationTag {
  @PrimaryColumn({ name: 'conversation_id', type: 'bigint' })
  conversationId: string;

  @ManyToOne(() => MessagingConversation, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'conversation_id' })
  conversation: MessagingConversation;

  @PrimaryColumn({ name: 'tag_id', type: 'bigint' })
  tagId: string;

  @ManyToOne(() => MessagingTag, (tag) => tag.conversationTags, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'tag_id' })
  tag: MessagingTag;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
