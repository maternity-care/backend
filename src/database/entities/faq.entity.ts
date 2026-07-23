import { ApiProperty } from '@nestjs/swagger';
import { FaqStatusEnum } from 'src/common/constants/status.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('faqs')
export class Faq {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'author_id', type: 'bigint' })
  authorId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'question', type: 'varchar', length: 255 })
  question: string;

  @ApiProperty({ type: String })
  @Column({ name: 'answer', type: 'text' })
  answer: string;

  @ApiProperty({ type: String })
  @Column({ name: 'category', type: 'varchar', length: 255 })
  category: string;

  @ApiProperty({ enum: FaqStatusEnum, enumName: 'FaqStatusEnum' })
  @Column({ name: 'status', type: 'enum', enum: FaqStatusEnum })
  status: FaqStatusEnum;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
