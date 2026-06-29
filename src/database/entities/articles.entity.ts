import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ArticleStatus } from '../../common/constants/status.enum';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'author_id', type: 'bigint' })
  authorId: string;

  @Column({ type: 'varchar', length: 250 })
  title: string;

  @Column({ type: 'varchar', length: 250, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  summary: string;

  @Column({ type: 'longtext' })
  content: string;

  @Column({ type: 'varchar', length: 30 })
  status: ArticleStatus;

  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
