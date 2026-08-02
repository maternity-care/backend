import { ForumCategory } from './../../common/constants/forum.enum';
import { ForumContentStatus } from './../../common/constants/status.enum';
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

  @ApiProperty({ type: String, example: 'staff or user' })
  @Column({ name: 'author_role', type: 'varchar', length: 255, default: 'user' })
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

  @ApiProperty({ enum: ForumCategory, enumName: 'ForumCategory' })
  @Column({
    name: 'category',
    type: 'enum',
    enum: ForumCategory,
    default: ForumCategory.PREGNANCY,
  })
  category: ForumCategory;

  @ApiProperty({ type: String })
  @Column({ name: 'content', type: 'text' })
  content: string;

  @ApiProperty({ type: String, required: false })
  @Column({ name: 'cover_image_url', type: 'varchar', length: 500, nullable: true })
  coverImageUrl: string | null;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'commentable', type: 'boolean', default: true })
  commentable: boolean | number;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean | number;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean | number;

  @ApiProperty({ enum: ForumContentStatus, enumName: 'ForumContentStatus' })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ForumContentStatus,
    default: ForumContentStatus.PENDING,
  })
  status: ForumContentStatus;

  @ApiProperty({ type: String, required: false })
  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy: string | null;

  @ApiProperty({ type: Date, required: false })
  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @ApiProperty({ type: String, required: false })
  @Column({ name: 'moderated_by', type: 'bigint', nullable: true })
  moderatedBy: string | null;

  @ApiProperty({ type: Date, required: false })
  @Column({ name: 'moderated_at', type: 'timestamp', nullable: true })
  moderatedAt: Date | null;

  @ApiProperty({ type: String, required: false })
  @Column({ name: 'moderation_reason', type: 'text', nullable: true })
  moderationReason: string | null;

  @ApiProperty({ type: Date, required: false })
  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
