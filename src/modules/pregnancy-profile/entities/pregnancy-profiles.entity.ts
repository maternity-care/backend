import { UserProfile } from 'src/database/entities';
import { User } from 'src/modules/users/entities/user.entity';
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

@Entity('pregnancy_profiles')
export class PregnancyProfile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ name: 'last_menstrual_period', type: 'date', nullable: true })
  lastMenstrualPeriod: string;

  @Column({ name: 'expected_due_date', type: 'date', nullable: true })
  expectedDueDate: string;

  @Column({ type: 'int' })
  gravida: number;

  //Số lần sinh đủ tháng: P
  @Column({ name: 'para_full_term', type: 'tinyint', default: 0 })
  paraFullTerm: number;

  //Số lần sinh non: A1
  @Column({ name: 'para_premature', type: 'tinyint', default: 0 })
  paraPremature: number;

  //Số lần sảy, lưu, nạo hút: R
  @Column({
    name: 'para_abortion',
    type: 'tinyint',
    default: 0,
  })
  paraAbortion: number;

  //Số con hiện sống: A2
  @Column({
    name: 'para_living_children',
    type: 'tinyint',
    default: 0,
  })
  paraLivingChildren: number;

  @Column({ name: 'risk_level', type: 'varchar', length: 30 })
  riskLevel: string;

  @Column({ type: 'varchar', length: 30 })
  status: string;
  // ACTIVE: đang mang thai, COMPLETED: Đã sinh, TERMINATED: Đã hủy thai (sảy thai, thai lưu, đình chỉ thai nghén)

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'bigint', nullable: true })
  deletedBy: string;

  @Column({ name: 'deleted_reason', type: 'text', nullable: true })
  deletedReason: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  user: User; // lấy tên và sđt thai phụ

  @ManyToOne(() => UserProfile, (userProfile) => userProfile.userId)
  @JoinColumn({ name: 'patient_id', referencedColumnName: 'userId' })
  userProfile: UserProfile; // lấy các thông tin ngày sinh, ... khác của thai phụ

  get PARA(): string {
    return `${this.paraFullTerm}/${this.paraPremature}/${this.paraAbortion}/${this.paraLivingChildren}`;
  }
}
