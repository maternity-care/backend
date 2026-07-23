import { ApiProperty } from '@nestjs/swagger';
import { ActiveStatus } from 'src/common/constants/status.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('room_types')
export class RoomType {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'description', type: 'text' })
  description: string;

  @ApiProperty({ enum: ActiveStatus, enumName: 'RoomTypeStatusEnum' })
  @Column({ name: 'status', type: 'enum', enum: ActiveStatus })
  status: ActiveStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
