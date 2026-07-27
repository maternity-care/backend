import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../../common/constants/status.enum';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Service } from '../../services/entities/service.entity';

@Entity('service_types')
@Index('uq_service_types_code', ['code'], { unique: true })
@Index('uq_service_types_name', ['name'], { unique: true })
@Index('idx_service_types_status', ['status'])
export class ServiceType {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String, example: 'ULTRASOUND' })
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ type: String, example: 'Siêu âm' })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ enum: ActiveStatus, enumName: 'ServiceTypeStatusEnum' })
  @Column({ name: 'status', type: 'enum', enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @OneToMany(() => Service, (service) => service.serviceType)
  services: Service[];

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'deleted_by', type: 'bigint', nullable: true })
  deletedBy: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'delete_reason', type: 'text', nullable: true })
  deleteReason: string | null;
}
