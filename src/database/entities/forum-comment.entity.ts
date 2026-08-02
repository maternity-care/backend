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
import { ForumPost } from './forum-post.entity';

@Entity('forum_comments')
export class ForumComment {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => ForumPost })
  @ManyToOne(() => ForumPost, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'post_id' })
  post: ForumPost;

  @ApiProperty({ type: String })
  @Column({ name: 'author', type: 'varchar', length: 255 })
  author: string;

  @ApiProperty({ type: String })
  @Column({ name: 'post_id', type: 'bigint' })
  postId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'author_id', type: 'bigint' })
  authorId: string;

  @ApiProperty({ type: String, example: 'staff or user' })
  @Column({ name: 'author_role', type: 'varchar', length: 255 })
  authorRole: string;

  @ApiProperty({ type: String })
  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId: string | null;

  @ApiProperty({ type: String, example: 'text or file or image or video or audio' })
  @Column({ name: 'message_type', type: 'varchar', length: 255, default: 'text' })
  messageType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'content', type: 'text' })
  content: string;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'is_doctor_answer', type: 'boolean', default: false })
  isDoctorAnswer: boolean | number;

  @ApiProperty({ enum: ForumContentStatus, enumName: 'ForumContentStatus' })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ForumContentStatus,
    default: ForumContentStatus.PUBLISHED,
  })
  status: ForumContentStatus;

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
