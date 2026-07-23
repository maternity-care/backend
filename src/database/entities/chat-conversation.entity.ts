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
import { Staff } from 'src/modules/staffs/entities/staff.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { ConversationStatus } from 'src/common/constants/status.enum';

@Entity('chat_conversations')
export class ChatConversation {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Staff;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ type: String })
  @Column({ name: 'doctor_id', type: 'bigint' })
  doctorId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'conversation_type', type: 'varchar', length: 255 })
  conversationType: string;

  @ApiProperty({ type: Number })
  @Column({ name: 'priority', type: 'int' })
  priority: number;

  @ApiProperty({ enum: ConversationStatus, enumName: 'ConversationStatus' })
  @Column({ name: 'status', type: 'enum', enum: ConversationStatus })
  status: ConversationStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
