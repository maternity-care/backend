import { Staff } from './../../modules/staffs/entities/staff.entity';
import { FaqStatusEnum } from './../../common/constants/status.enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('faqs')
export class Faq {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @ManyToOne(() => Staff, { nullable: true })
  author: string;

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
  @Column({ name: 'category', type: 'varchar', length: 255, default: 'common' })
  category: string | null;

  @ApiProperty({ enum: FaqStatusEnum, enumName: 'FaqStatusEnum' })
  @Column({ name: 'status', type: 'enum', enum: FaqStatusEnum, default: FaqStatusEnum.ACTIVE })
  status: FaqStatusEnum;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
