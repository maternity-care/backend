import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PackageItem } from '../../package-services/entities/package-item.entity';
import { MaternityPackageStageType } from '../dto/requests/create-maternity-package.dto';
import { MaternityPackage } from './maternity-package.entity';

@Entity('package_stages')
@Index('idx_package_stages_package_id', ['packageId'])
@Index('idx_package_stages_order', ['packageId', 'sortOrder'])
export class PackageStage {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'package_id', type: 'bigint' })
  packageId: string;

  @ManyToOne(() => MaternityPackage, (pkg) => pkg.stages, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package: MaternityPackage;

  @ApiProperty({ type: String, example: 'Tuần 12 - 14' })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ enum: MaternityPackageStageType, enumName: 'MaternityPackageStageType' })
  @Column({
    name: 'stage_type',
    type: 'enum',
    enum: MaternityPackageStageType,
    default: MaternityPackageStageType.PREGNANCY_WEEK,
  })
  stageType: MaternityPackageStageType;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'week_from', type: 'int', nullable: true })
  weekFrom: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'week_to', type: 'int', nullable: true })
  weekTo: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ name: 'goal', type: 'text', nullable: true })
  goal: string | null;

  @ApiProperty({ type: Number })
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => PackageItem, (item) => item.stage)
  items: PackageItem[];

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
