import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { DoctorShiftStatus } from '../../common/constants/status.enum';
import { addDays, isShiftInPast } from './helpers/shifts.helper';
import { WeeklyUpdateShiftItemDto, WeeklyUpdateShiftsDto } from './dto/requests/weekly-update-shifts.dto';
import { DoctorShift } from './entities/shift.entity';
import { IShiftsRepository, SHIFTS_REPOSITORY } from './interfaces/shifts-repository.interface';
import { WeeklyShiftUpdateBlockedItem, WeeklyShiftUpdateResult } from './interfaces/weekly-shift-update.interface';
import { ShiftsService } from './shifts.service';

@Injectable()
export class WeeklyShiftUpdateService {
  constructor(
    @Inject(SHIFTS_REPOSITORY)
    private readonly repository: IShiftsRepository,
    private readonly shiftsService: ShiftsService,
  ) {}

  /**
   * Cap nhat mot tuan theo tung dong. Dong loi bi dua vao blocked, cac dong hop le van duoc luu.
   * Ca da co appointment tiep tuc dung rule cua ShiftsService.update, nen khong bi ghi de ngoai y muon.
   */
  async updateWeek(dto: WeeklyUpdateShiftsDto, changedBy?: string | null): Promise<WeeklyShiftUpdateResult> {
    this.validateWeekInput(dto);
    const weekEnd = addDays(dto.weekStart, 6);
    const existingShifts = await this.repository.findWeekly(dto.facilityId, dto.weekStart, weekEnd);
    const existingById = new Map(existingShifts.map(shift => [String(shift.id), shift]));
    const submittedIds = new Set(dto.shifts.flatMap(item => item.shiftId ? [item.shiftId] : []));
    const removedIds = new Set(dto.removedShiftIds ?? []);

    if (submittedIds.size !== dto.shifts.filter(item => item.shiftId).length) {
      throw new BadRequestException('Mot ca truc khong duoc gui lap lai trong lich tuan.');
    }
    for (const shiftId of submittedIds) {
      if (removedIds.has(shiftId)) {
        throw new BadRequestException(`Ca truc ${shiftId} khong the vua cap nhat vua xoa.`);
      }
    }

    const created: DoctorShift[] = [];
    const updated: DoctorShift[] = [];
    const unchanged: DoctorShift[] = [];
    const removedShiftIds: string[] = [];
    const blocked: WeeklyShiftUpdateBlockedItem[] = [];

    // Xoa ca khong con trong mau truoc, de giai phong phong/bac si cho cac dong moi trong cung request.
    for (const [index, shiftId] of [...removedIds].entries()) {
      const shift = existingById.get(shiftId);
      if (!shift) {
        blocked.push({ index, action: 'remove', shiftId, reason: 'Ca truc khong thuoc tuan hoac co so dang cap nhat.' });
        continue;
      }

      try {
        if (isShiftInPast(shift.shiftDate, shift.startTime, shift.endTime)) {
          throw new ConflictException('Ca truc trong qua khu chi duoc xem chi tiet.');
        }
        const appointments = await this.repository.findAppointmentsForShift(shift);
        if (appointments.length > 0) {
          throw new ConflictException('Ca truc da co lich hen, khong the bo khoi lich tuan; hay huy ca de xu ly disruption.');
        }
        await this.shiftsService.remove(shift.id, 'Bo khoi lich khi cap nhat tuan', changedBy);
        removedShiftIds.push(shift.id);
      } catch (error) {
        blocked.push({ index, action: 'remove', shiftId, shiftDate: shift.shiftDate, reason: this.errorMessage(error) });
      }
    }

    for (const [index, item] of dto.shifts.entries()) {
      const existing = item.shiftId ? existingById.get(item.shiftId) : undefined;
      if (item.shiftId && !existing) {
        blocked.push({
          index,
          action: 'update',
          shiftId: item.shiftId,
          shiftDate: item.shiftDate,
          reason: 'Ca truc khong thuoc tuan hoac co so dang cap nhat.',
        });
        continue;
      }

      try {
        if (existing && this.isUnchanged(existing, item)) {
          unchanged.push(existing);
          continue;
        }

        if (existing) {
          updated.push(await this.shiftsService.update(existing.id, {
            staffId: item.staffId,
            roleId: item.roleId ?? undefined,
            facilityId: dto.facilityId,
            roomId: item.status === DoctorShiftStatus.OFF ? null : item.roomId ?? null,
            slotId: item.slotId,
            shiftDate: item.shiftDate,
            maxAppointments: item.maxAppointments,
            status: item.status,
            note: item.note,
          }, changedBy));
          continue;
        }

        created.push(await this.shiftsService.create({
          staffId: item.staffId,
          roleId: item.roleId ?? undefined,
          facilityId: dto.facilityId,
          roomId: item.status === DoctorShiftStatus.OFF ? undefined : item.roomId ?? undefined,
          slotId: item.slotId,
          shiftDate: item.shiftDate,
          maxAppointments: item.maxAppointments,
          status: item.status,
          note: item.note,
        }));
      } catch (error) {
        blocked.push({
          index,
          action: existing ? 'update' : 'create',
          shiftId: existing?.id,
          shiftDate: item.shiftDate,
          reason: this.errorMessage(error),
        });
      }
    }

    return {
      created,
      updated,
      unchanged,
      removedShiftIds,
      blocked,
      summary: {
        created: created.length,
        updated: updated.length,
        unchanged: unchanged.length,
        removed: removedShiftIds.length,
        blocked: blocked.length,
      },
    };
  }

  private validateWeekInput(dto: WeeklyUpdateShiftsDto): void {
    const weekEnd = addDays(dto.weekStart, 6);
    if (new Date(`${dto.weekStart}T00:00:00+07:00`).getDay() !== 1) {
      throw new BadRequestException('weekStart phai la ngay Thu Hai.');
    }
    if (dto.shifts.length === 0 && (dto.removedShiftIds?.length ?? 0) === 0) {
      throw new BadRequestException('Can gui it nhat mot ca can tao, cap nhat hoac xoa.');
    }
    for (const item of dto.shifts) {
      if (item.shiftDate < dto.weekStart || item.shiftDate > weekEnd) {
        throw new BadRequestException(`Ngay ${item.shiftDate} khong nam trong tuan ${dto.weekStart} - ${weekEnd}.`);
      }
      if (![DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.OFF].includes(item.status)) {
        throw new BadRequestException('Lich tuan chi chap nhan trang thai available hoac off.');
      }
    }
  }

  private isUnchanged(shift: DoctorShift, item: WeeklyUpdateShiftItemDto): boolean {
    return shift.staffId === item.staffId
      && (shift.roleId ?? null) === (item.roleId ?? null)
      && (shift.roomId ?? null) === (item.status === DoctorShiftStatus.OFF ? null : item.roomId ?? null)
      && (shift.slotId ?? null) === item.slotId
      && String(shift.shiftDate) === item.shiftDate
      && (shift.maxAppointments ?? null) === (item.maxAppointments ?? null)
      && shift.status === item.status
      && (shift.note ?? '') === (item.note ?? '');
  }

  private errorMessage(error: unknown): string {
    if (error instanceof BadRequestException || error instanceof ConflictException) {
      const response = error.getResponse();
      if (typeof response === 'string') return response;
      if (response && typeof response === 'object' && 'message' in response) {
        const message = (response as { message?: unknown }).message;
        return Array.isArray(message) ? message.join('; ') : String(message);
      }
    }
    return error instanceof Error ? error.message : 'Khong the cap nhat ca truc.';
  }
}
