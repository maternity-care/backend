import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'conversation_id', type: 'bigint' })
  conversationId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'sender_id', type: 'bigint' })
  senderId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'sender_type', type: 'varchar', length: 255 })
  senderType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'message_type', type: 'varchar', length: 255 })
  messageType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'content', type: 'text' })
  content: string;

  @ApiProperty({ type: String })
  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl: string;

  @ApiProperty({ type: Date })
  @Column({ name: 'read_at', type: 'timestamp' })
  readAt: Date;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
