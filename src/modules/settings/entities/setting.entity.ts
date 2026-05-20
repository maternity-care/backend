import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'setting_key', type: 'varchar', length: 150, unique: true })
  key: string;

  @Column({ name: 'setting_value', type: 'json' })
  value: unknown;

  @Column({ type: 'varchar', length: 100, default: 'general' })
  group: string;

  @Column({ name: 'is_public', type: 'tinyint', default: 1 })
  isPublic: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
