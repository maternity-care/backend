import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ForumTopic } from './forum-topic.entity';
import { ForumContentStatus } from 'src/common/constants/status.enum';

@Entity('forum_posts')
export class ForumPost {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => ForumTopic })
  @ManyToOne(() => ForumTopic, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'forum_topic_id' })
  forumTopic: ForumTopic;

  @ApiProperty({ type: String })
  @Column({ name: 'author', type: 'varchar', length: 255 })
  author: string;

  @ApiProperty({ type: String })
  @Column({ name: 'author_id', type: 'bigint' })
  authorId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'author_role', type: 'varchar', length: 255 })
  authorRole: string;

  @ApiProperty({ type: String })
  @Column({ name: 'forum_topic_id', type: 'bigint' })
  forumTopicId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ type: String })
  @Column({ name: 'slug', type: 'varchar', length: 255 })
  slug: string;

  @ApiProperty({ type: String })
  @Column({ name: 'content', type: 'text' })
  content: string;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'commentable', type: 'boolean' })
  commentable: boolean;

  @ApiProperty({ enum: ForumContentStatus, enumName: 'ForumContentStatus' })
  @Column({ name: 'status', type: 'enum', enum: ForumContentStatus })
  status: ForumContentStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
