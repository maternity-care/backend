import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { FacilitySuspendImpact } from '../interfaces/facility-repository.interface';
import { Room } from '../../rooms/entities/room.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { ShiftDisruption } from '../../shifts/entities/shift-disruption.entity';
import { DoctorShiftChangeLog } from '../../shifts/entities/doctor-shift-change-log.entity';
import { AppointmentDisruptionItem } from '../../shifts/entities/appointment-disruption-item.entity';
import {
  ActiveStatus,
  AppointmentDisruptionResolutionStatus,
  AppointmentStatus,
  DoctorShiftStatus,
  InactiveSource,
  ShiftDisruptionStatus,
} from '../../../common/constants/status.enum';
import { addDays, dateTimeToTime, shiftIntervalsOverlap } from '../../shifts/helpers/shifts.helper';

interface AffectedAppointmentBlock {
  id: string;
  doctorId: string;
  roomId: string | null;
  scheduledStart: Date | string;
  scheduledEnd: Date | string;
  status: string;
}

@Injectable()
export class FacilityImpactRepository {
  constructor(
    @InjectEntityManager()
    private readonly manager: EntityManager,
  ) {}

  // Đếm số lượng phòng, ca làm việc và cuộc hẹn bị ảnh hưởng bởi việc đình chỉ hoạt động của cơ sở y tế
  async countSuspendImpact(facilityId: string, from: Date, until?: Date | null): Promise<FacilitySuspendImpact> {
    const fromDate = from.toISOString().slice(0, 10);
    const untilDate = until ? until.toISOString().slice(0, 10) : null;
    const activeAppointmentStatuses = [
      AppointmentStatus.PENDING_PAYMENT,
      AppointmentStatus.BOOKED,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CHECKED_IN,
      AppointmentStatus.IN_PROGRESS,
    ];

    const roomQuery = this.manager.createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('rooms', 'room')
      .where('room.facility_id = :facilityId', { facilityId })
      .andWhere('room.deleted_at IS NULL');

    const shiftQuery = this.manager.createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('shifts', 'shift')
      .where('shift.facility_id = :facilityId', { facilityId })
      .andWhere('shift.deleted_at IS NULL')
      .andWhere('shift.status IN (:...statuses)', {
        statuses: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.FULL, DoctorShiftStatus.OFF],
      })
      .andWhere('shift.shift_date >= :fromDate', { fromDate });

    if (untilDate) {
      shiftQuery.andWhere('shift.shift_date <= :untilDate', { untilDate });
    }

    const appointmentQuery = this.manager.createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('appointments', 'appointment')
      .where('appointment.facility_id = :facilityId', { facilityId })
      .andWhere('appointment.status IN (:...statuses)', { statuses: activeAppointmentStatuses })
      .andWhere('appointment.scheduled_start >= :from', { from });

    if (until) {
      appointmentQuery.andWhere('appointment.scheduled_start <= :until', { until });
    }

    const [roomRow, shiftRow, appointmentRow] = await Promise.all([
      roomQuery.getRawOne<{ count: string }>(),
      shiftQuery.getRawOne<{ count: string }>(),
      appointmentQuery.getRawOne<{ count: string }>(),
    ]);

    return {
      affectedRooms: Number(roomRow?.count ?? 0),
      affectedShifts: Number(shiftRow?.count ?? 0),
      affectedAppointments: Number(appointmentRow?.count ?? 0),
    };
  }

  // Đình chỉ các phòng đang hoạt động của cơ sở y tế trong khoảng thời gian xác định
  async suspendActiveRoomsForFacility(
    facilityId: string,
    from: Date,
    until: Date | null,
    reason?: string | null,
    actorId?: string | null,
  ): Promise<number> {
    const result = await this.manager.createQueryBuilder()
      .update(Room)
      .set({
        status: ActiveStatus.INACTIVE,
        inactiveFrom: from,
        inactiveUntil: until,
        inactiveReason: reason ?? null,
        inactiveSource: InactiveSource.FACILITY_SUSPEND,
        inactiveBy: actorId ?? null,
        reactivatedAt: null,
        reactivatedBy: null,
      })
      .where('facility_id = :facilityId', { facilityId })
      .andWhere('deleted_at IS NULL')
      .andWhere('status = :status', { status: ActiveStatus.ACTIVE })
      .execute();

    return result.affected ?? 0;
  }

  // Kích hoạt lại các phòng bị đình chỉ bởi cơ sở y tế
  async reactivateRoomsSuspendedByFacility(facilityId: string, actorId?: string | null): Promise<number> {
    const result = await this.manager.createQueryBuilder()
      .update(Room)
      .set({
        status: ActiveStatus.ACTIVE,
        inactiveSource: null,
        reactivatedAt: new Date(),
        reactivatedBy: actorId ?? null,
      })
      .where('facility_id = :facilityId', { facilityId })
      .andWhere('deleted_at IS NULL')
      .andWhere('status = :status', { status: ActiveStatus.INACTIVE })
      .andWhere('inactive_source = :source', { source: InactiveSource.FACILITY_SUSPEND })
      .execute();

    return result.affected ?? 0;
  }

  async cancelFutureShiftsForFacility(
    facilityId: string,
    from: Date,
    until?: Date | null,
    reason?: string | null,
    actorId?: string | null,
  ): Promise<number> {
    return this.manager.transaction(async manager => {
      const shifts = await this.findSuspendAffectedShifts(manager, { facilityId }, from, until);

      for (const shift of shifts) {
        const affectedAppointments = await this.findActiveAppointmentsForShift(manager, shift);

        await manager.update(Shift, shift.id, {
          status: DoctorShiftStatus.CANCELLED,
        });

        await this.insertShiftChangeLog(manager, shift, 'facility_suspended', reason, actorId);

        if (affectedAppointments.length > 0) {
          await this.insertShiftDisruption(manager, shift, affectedAppointments, {
            type: 'facility_suspended',
            sourceType: 'facility',
            sourceId: facilityId,
            reason,
            actorId,
          });
        }
      }

      return shifts.length;
    });
  }

  private findSuspendAffectedShifts(
    manager: EntityManager,
    scope: { facilityId: string; roomId?: string },
    from: Date,
    until?: Date | null,
  ): Promise<Shift[]> {
    const query = manager.getRepository(Shift)
      .createQueryBuilder('shift')
      .setLock('pessimistic_write')
      .where('shift.facilityId = :facilityId', { facilityId: scope.facilityId })
      .andWhere('shift.deletedAt IS NULL')
      .andWhere('shift.status IN (:...statuses)', {
        statuses: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.FULL, DoctorShiftStatus.OFF],
      })
      .andWhere('shift.shiftDate >= :fromDate', { fromDate: from.toISOString().slice(0, 10) })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.startTime', 'ASC');

    if (scope.roomId) {
      query.andWhere('shift.roomId = :roomId', { roomId: scope.roomId });
    }

    if (until) {
      query.andWhere('shift.shiftDate <= :untilDate', { untilDate: until.toISOString().slice(0, 10) });
    }

    return query.getMany();
  }

  private async findActiveAppointmentsForShift(
    manager: EntityManager,
    shift: Shift,
  ): Promise<AffectedAppointmentBlock[]> {
    const shiftDate = this.formatDateOnly(shift.shiftDate);
    const nextDate = addDays(shiftDate, 1);
    const appointments = await manager.createQueryBuilder()
      .select('appointment.id', 'id')
      .addSelect('appointment.doctor_id', 'doctorId')
      .addSelect('appointment.room_id', 'roomId')
      .addSelect('appointment.scheduled_start', 'scheduledStart')
      .addSelect('appointment.scheduled_end', 'scheduledEnd')
      .addSelect('appointment.status', 'status')
      .from('appointments', 'appointment')
      .where('appointment.facility_id = :facilityId', { facilityId: shift.facilityId })
      .andWhere('appointment.doctor_id = :staffId', { staffId: shift.staffId })
      .andWhere('DATE(appointment.scheduled_start) BETWEEN :shiftDate AND :nextDate', { shiftDate, nextDate })
      .andWhere('appointment.status IN (:...statuses)', {
        statuses: [
          AppointmentStatus.PENDING_PAYMENT,
          AppointmentStatus.BOOKED,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CHECKED_IN,
          AppointmentStatus.IN_PROGRESS,
        ],
      })
      .orderBy('appointment.scheduled_start', 'ASC')
      .getRawMany<AffectedAppointmentBlock>();

    return appointments.filter(appointment =>
      shiftIntervalsOverlap(
        shiftDate,
        shift.startTime,
        shift.endTime,
        this.formatDateOnly(appointment.scheduledStart),
        dateTimeToTime(appointment.scheduledStart),
        dateTimeToTime(appointment.scheduledEnd),
      ),
    );
  }

  private async insertShiftChangeLog(
    manager: EntityManager,
    shift: Shift,
    action: string,
    reason?: string | null,
    actorId?: string | null,
  ): Promise<void> {
    await manager.createQueryBuilder().insert().into(DoctorShiftChangeLog).values({
      shiftId: shift.id,
      action,
      oldStatus: shift.status,
      newStatus: DoctorShiftStatus.CANCELLED,
      oldStaffId: shift.staffId,
      newStaffId: shift.staffId,
      oldRoomId: shift.roomId,
      newRoomId: shift.roomId,
      oldStartTime: shift.startTime,
      newStartTime: shift.startTime,
      oldEndTime: shift.endTime,
      newEndTime: shift.endTime,
      reason: reason ?? null,
      changedBy: actorId ?? null,
    }).execute();
  }

  private async insertShiftDisruption(
    manager: EntityManager,
    shift: Shift,
    affectedAppointments: AffectedAppointmentBlock[],
    options: {
      type: string;
      sourceType: string;
      sourceId: string;
      reason?: string | null;
      actorId?: string | null;
    },
  ): Promise<void> {
    const result = await manager.createQueryBuilder().insert().into(ShiftDisruption).values({
      type: options.type,
      sourceType: options.sourceType,
      sourceId: options.sourceId,
      facilityId: shift.facilityId,
      shiftId: shift.id,
      staffId: shift.staffId,
      doctorShiftId: shift.id,
      roomId: shift.roomId ?? null,
      reason: options.reason ?? null,
      status: ShiftDisruptionStatus.OPEN,
      createdBy: options.actorId ?? null,
    }).execute();
    
    const disruptionId = String(result.identifiers[0]?.id);

    await manager.createQueryBuilder().insert().into(AppointmentDisruptionItem).values(
      affectedAppointments.map(appointment => ({
        disruptionId,
        appointmentId: appointment.id,
        oldStaffId: shift.staffId,
        oldDoctorId: shift.staffId,
        oldRoomId: shift.roomId ?? null,
        oldScheduledStart: appointment.scheduledStart as Date,
        oldScheduledEnd: appointment.scheduledEnd as Date,
        resolutionStatus: AppointmentDisruptionResolutionStatus.PENDING,
      })),
    ).execute();
  }

  private formatDateOnly(value: string | Date): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }
}
