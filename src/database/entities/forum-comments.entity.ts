import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ForumContentStatus } from '../../common/constants/status.enum';

@Entity('forum_comments')
export class ForumComment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'post_id', type: 'bigint' })
  postId: string;

  @Column({ name: 'author_id', type: 'bigint' })
  authorId: string;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 30 })
  status: ForumContentStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
