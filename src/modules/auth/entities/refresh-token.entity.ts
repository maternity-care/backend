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
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ type: String })
  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  @ApiProperty({ type: Date })
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @ApiProperty({ type: Date })
  @Column({ name: 'revoked_at', type: 'timestamp' })
  revokedAt: Date;

  @ApiProperty({ type: String })
  @Column({ name: 'replaced_by_token_hash', type: 'varchar', length: 255 })
  replacedByTokenHash: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
