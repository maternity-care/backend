import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActiveStatus } from '../../../common/constants/status.enum';
import { Facility } from '../../facilities/entities/facilities.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ManyToOne(() => Facility, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'room_type', type: 'varchar', length: 50 })
  roomType: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  floor: string;

  @Column({ type: 'varchar', length: 30 })
  status: ActiveStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'bigint', nullable: true })
  deletedBy: string | null;

  @Column({ name: 'delete_reason', type: 'varchar', length: 500, nullable: true })
  deleteReason: string | null;

}
