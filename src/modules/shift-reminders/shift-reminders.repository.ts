import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface FacilityMissingSchedule {
  id: string;
  name: string;
}

@Injectable()
export class ShiftRemindersRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Tìm cơ sở active chưa có ca làm việc hợp lệ trong tuần cần kiểm tra. */
  findFacilitiesMissingSchedule(weekStart: string, weekEnd: string) {
    return this.dataSource.createQueryBuilder()
      .select('facility.id', 'id')
      .addSelect('facility.name', 'name')
      .from('facilities', 'facility')
      .where('facility.status = :active', { active: 'active' })
      .andWhere(`NOT EXISTS (
        SELECT 1 FROM shifts shift
        WHERE shift.facility_id = facility.id
          AND shift.shift_date BETWEEN :weekStart AND :weekEnd
          AND shift.status IN ('available', 'full')
          AND shift.deleted_at IS NULL
      )`, { weekStart, weekEnd })
      .getRawMany<FacilityMissingSchedule>();
  }

  /** Chỉ lấy admin thuộc cơ sở và chủ cơ sở; Super Admin không nhận cảnh báo vận hành. */
  async findFacilityAdminIds(facilityId: string): Promise<string[]> {
    const rows = await this.dataSource.createQueryBuilder()
      .select('DISTINCT staff.id', 'id')
      .from('staffs', 'staff')
      .leftJoin('staff_roles', 'staffRole', 'staffRole.staff_id = staff.id')
      .leftJoin('roles', 'role', 'role.id = staffRole.role_id AND role.deleted_at IS NULL')
      .leftJoin('facilities', 'facility', 'facility.id = :facilityId', { facilityId })
      .where('staff.status = :active', { active: 'active' })
      .andWhere('(staff.id = facility.owner_id OR (staff.facility_id = :facilityId AND role.name = :admin))', {
        facilityId,
        admin: 'admin',
      })
      .getRawMany<{ id: string }>();

    return rows.map(row => String(row.id));
  }
}
