import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ActiveStatus } from '../../common/constants/status.enum';

@Entity('forum_categories')
export class ForumCategoryMetadata {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String, example: 'pregnancy' })
  @Column({ name: 'code', type: 'varchar', length: 50, unique: true })
  code: string;

  @ApiProperty({ type: String, example: 'Thai kỳ' })
  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({ type: String, required: false })
  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @ApiProperty({ type: Number, example: 1 })
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ApiProperty({ enum: ActiveStatus, enumName: 'ActiveStatus' })
  @Column({ name: 'status', type: 'enum', enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
