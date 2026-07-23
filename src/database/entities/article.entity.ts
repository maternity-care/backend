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
import { ArticleStatus } from 'src/common/constants/status.enum';
import { Staff } from 'src/modules/staffs/entities/staff.entity';

@Entity('articles')
export class Article {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: Staff;

  @ApiProperty({ type: String })
  @Column({ name: 'author_id', type: 'bigint' })
  authorId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ type: String })
  @Column({ name: 'slug', type: 'varchar', length: 255, unique: true })
  slug: string;

  @ApiProperty({ type: String })
  @Column({ name: 'summary', type: 'varchar', length: 255 })
  summary: string;

  @ApiProperty({ type: String })
  @Column({ name: 'content', type: 'text' })
  content: string;

  @ApiProperty({ enum: ArticleStatus, enumName: 'ArticleStatus' })
  @Column({ name: 'status', type: 'enum', enum: ArticleStatus })
  status: ArticleStatus;

  @ApiProperty({ type: String })
  @Column({ name: 'approved_by', type: 'bigint' })
  approvedBy: string;

  @ApiProperty({ type: Date })
  @Column({ name: 'approved_at', type: 'timestamp' })
  approvedAt: Date;

  @ApiProperty({ type: Date })
  @Column({ name: 'published_at', type: 'timestamp' })
  publishedAt: Date;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
