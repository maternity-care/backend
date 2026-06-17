import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('staff_profiles')
export class StaffProfile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint', unique: true })
  userId: string;

  @Column({ name: 'employee_code', type: 'varchar', length: 100, unique: true })
  employeeCode: string;

  @Column({ type: 'varchar', length: 100 })
  position: string;

  @Column({ type: 'varchar', length: 30 })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
