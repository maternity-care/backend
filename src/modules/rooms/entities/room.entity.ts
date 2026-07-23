import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from 'src/common/constants/status.enum';
import { Facility } from 'src/database/entities';
import { RoomType } from 'src/database/entities/room-type.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('rooms')
export class Room {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: () => RoomType })
  @ManyToOne(() => RoomType, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'room_type_id', type: 'bigint' })
  roomTypeId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'floor', type: 'varchar', length: 255 })
  floor: string;

  @ApiProperty({ enum: ActiveStatus, enumName: 'RoomStatusEnum' })
  @Column({ name: 'status', type: 'enum', enum: ActiveStatus })
  status: ActiveStatus;

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
  @Column({ name: 'deleted_by', type: 'varchar', length: 255, nullable: true })
  deletedBy: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'deleted_reason', type: 'text', nullable: true })
  deletedReason: string | null;
}
