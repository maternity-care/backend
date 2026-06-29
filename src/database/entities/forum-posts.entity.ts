import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ForumContentStatus } from '../../common/constants/status.enum';

@Entity('forum_posts')
export class ForumPost {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'author_id', type: 'bigint' })
  authorId: string;

  @Column({ type: 'varchar', length: 250 })
  title: string;

  @Column({ type: 'longtext' })
  content: string;

  @Column({ type: 'varchar', length: 30 })
  status: ForumContentStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
