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
import { ForumContentStatus } from 'src/common/constants/status.enum';

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

  @ApiProperty({ type: String })
  @Column({ name: 'author_role', type: 'varchar', length: 255 })
  authorRole: string;

  @ApiProperty({ type: String })
  @Column({ name: 'parent_id', type: 'bigint' })
  parentId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'message_type', type: 'varchar', length: 255 })
  messageType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'content', type: 'text' })
  content: string;

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
