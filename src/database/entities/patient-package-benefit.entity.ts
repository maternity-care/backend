import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Service } from 'src/modules/services/entities/service.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('patient_package_benefits')
export class PatientPackageBenefit {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Service })
  @ManyToOne(() => Service, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @ApiProperty({ type: String })
  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'service_id', type: 'bigint' })
  serviceId: string;

  @ApiProperty({ type: Number })
  @Column({ name: 'total_quantity', type: 'int' })
  totalQuantity: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'used_quantity', type: 'int' })
  usedQuantity: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'remaining_quantity', type: 'int' })
  remainingQuantity: number;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
