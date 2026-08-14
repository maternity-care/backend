import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  NotificationReferenceType,
  NotificationType,
} from '../../common/constants/notification.enum';
import {
  AppointmentDisruptionResolutionStatus,
  AppointmentStatus,
  DoctorShiftStatus,
  ShiftDisruptionStatus,
} from '../../common/constants/status.enum';
import { AppointmentsService } from '../appointments/appointments.service';
import { RescheduleAppointmentDto } from '../appointments/dto/requests/reschedule-appointment.dto';
import { Appointment } from '../appointments/entities/appointment.entity';
import { IMailService, MAIL_SERVICE } from '../mail/interfaces/mail-service.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { AppointmentDisruptionItem } from '../shifts/entities/appointment-disruption-item.entity';
import { ShiftDisruption } from '../shifts/entities/shift-disruption.entity';
import { CancelDisruptedAppointmentDto } from './dto/cancel-disrupted-appointment.dto';

const UNRESOLVED_STATUSES = [
  AppointmentDisruptionResolutionStatus.PENDING,
  AppointmentDisruptionResolutionStatus.REFUND_PENDING,
];

@Injectable()
export class AppointmentDisruptionsService {
  private readonly logger = new Logger(AppointmentDisruptionsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AppointmentDisruptionItem)
    private readonly itemRepository: Repository<AppointmentDisruptionItem>,
    private readonly appointmentsService: AppointmentsService,
    private readonly notificationsService: NotificationsService,
    @Inject(MAIL_SERVICE) private readonly mailService: IMailService,
  ) {}

  async findMine(patientId: string) {
    return this.buildListQuery()
      .andWhere('appointment.patient_id = :patientId', { patientId })
      .andWhere('item.resolution_status IN (:...statuses)', {
        statuses: UNRESOLVED_STATUSES,
      })
      .orderBy('item.created_at', 'DESC')
      .getRawMany();
  }

  async findOptions(itemId: string, patientId: string) {
    const item = await this.findOwnedItem(itemId, patientId);
    const appointment = item.appointment;
    const durationMinutes = Math.max(
      15,
      Math.round(
        (new Date(item.oldScheduledEnd).getTime() - new Date(item.oldScheduledStart).getTime()) / 60000,
      ),
    );
    const shifts = await this.dataSource.query(
      `
        SELECT shift.id AS shiftId, shift.shift_date AS shiftDate,
          shift.start_time AS startTime, shift.end_time AS endTime,
          doctor.id AS doctorId, staff.name AS doctorName,
          room.id AS roomId, room.name AS roomName
        FROM shifts shift
        INNER JOIN staffs staff ON staff.id = shift.staff_id
        INNER JOIN doctors doctor ON doctor.staff_id = staff.id
        INNER JOIN facilities facility ON facility.id = shift.facility_id AND facility.status = 'active'
        INNER JOIN rooms room ON room.id = shift.room_id AND room.status = 'active'
        WHERE shift.facility_id = ?
          AND shift.shift_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)
          AND shift.status = ?
          AND shift.deleted_at IS NULL
        ORDER BY shift.shift_date, shift.start_time, staff.name
      `,
      [appointment.facilityId, DoctorShiftStatus.AVAILABLE],
    );

    const options: Array<Record<string, unknown>> = [];
    for (const shift of shifts) {
      const appointments = await this.dataSource.query(
        `SELECT scheduled_start AS scheduledStart, scheduled_end AS scheduledEnd
         FROM appointments
         WHERE doctor_id = ? AND DATE(scheduled_start) = ?
           AND status IN ('pending_payment','booked','confirmed','rescheduled','checked_in','in_progress')
           AND id <> ?`,
        [
          await this.getShiftStaffId(String(shift.shiftId)),
          this.toDateText(shift.shiftDate),
          appointment.id,
        ],
      );
      for (let minute = this.timeToMinutes(shift.startTime); minute + durationMinutes <= this.timeToMinutes(shift.endTime); minute += durationMinutes) {
        const startTime = this.minutesToTime(minute);
        const endTime = this.minutesToTime(minute + durationMinutes);
        const occupied = appointments.some((current: { scheduledStart: Date; scheduledEnd: Date }) => {
          const currentStart = this.timeToMinutes(new Date(current.scheduledStart).toTimeString().slice(0, 8));
          const currentEnd = this.timeToMinutes(new Date(current.scheduledEnd).toTimeString().slice(0, 8));
          return minute < currentEnd && minute + durationMinutes > currentStart;
        });
        if (!occupied) {
          options.push({
            shiftId: String(shift.shiftId),
            doctorId: String(shift.doctorId),
            doctorName: shift.doctorName,
            roomId: String(shift.roomId),
            roomName: shift.roomName,
            date: this.toDateText(shift.shiftDate),
            startTime,
            endTime,
          });
        }
      }
    }
    return options;
  }

  async rescheduleMine(itemId: string, patientId: string, dto: RescheduleAppointmentDto) {
    const item = await this.findOwnedItem(itemId, patientId);
    this.assertPending(item);
    const appointment = await this.appointmentsService.reschedule(
      item.appointmentId,
      dto,
      item.appointment.facilityId,
    );
    await this.completeReschedule(item, dto, patientId);
    return appointment;
  }

  /** Hủy lịch bị ảnh hưởng và kết thúc hồ sơ xử lý, không mở quy trình hoàn tiền. */
  async cancelMine(itemId: string, patientId: string, dto: CancelDisruptedAppointmentDto) {
    const item = await this.findOwnedItem(itemId, patientId);
    this.assertCancellable(item);
    const reason = dto.reason?.trim() || item.shiftDisruption.reason || 'Ca trực bị hủy';
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Appointment, item.appointmentId, {
        status: AppointmentStatus.CANCELLED,
        cancelReason: reason,
      });
      await manager.update(AppointmentDisruptionItem, item.id, {
        resolutionStatus: AppointmentDisruptionResolutionStatus.CANCELLED,
        selectedOption: 'cancel',
        resolutionNote: reason,
        resolvedBy: patientId,
        resolvedAt: new Date(),
      });
      await manager.query(
        `UPDATE user_schedules
         SET status = 'cancelled', note = ?, updated_at = CURRENT_TIMESTAMP
         WHERE appointment_id = ? AND source = 'appointment'`,
        [reason, item.appointmentId],
      );
    });
    await this.updateDisruptionStatus(item.disruptionId);
    return this.itemRepository.findOneByOrFail({ id: item.id });
  }

  async dispatchBySource(sourceType: string, sourceId: string) {
    const disruptions = await this.dataSource.getRepository(ShiftDisruption).find({
      where: { sourceType, sourceId },
    });
    for (const disruption of disruptions) await this.dispatchDisruption(disruption.id);
  }

  async dispatchDisruption(disruptionId: string) {
    const rows = await this.dataSource.query(
      `
        SELECT item.id AS itemId, item.appointment_id AS appointmentId,
          item.old_scheduled_start AS oldScheduledStart, item.old_scheduled_end AS oldScheduledEnd,
          item.notified_at AS notifiedAt, item.email_sent_at AS emailSentAt,
          disruption.id AS disruptionId, disruption.facility_id AS facilityId,
          disruption.reason AS reason, patient.id AS patientId, patient.name AS patientName,
          patient.email AS patientEmail, facility.name AS facilityName,
          COALESCE(staff.name, 'bác sĩ phụ trách') AS doctorName
        FROM appointment_disruption_items item
        INNER JOIN shift_disruptions disruption ON disruption.id = item.disruption_id
        INNER JOIN appointments appointment ON appointment.id = item.appointment_id
        INNER JOIN users patient ON patient.id = appointment.patient_id
        INNER JOIN facilities facility ON facility.id = disruption.facility_id
        LEFT JOIN staffs staff ON staff.id = item.old_staff_id
        WHERE disruption.id = ?
      `,
      [disruptionId],
    );
    if (!rows.length) return;

    for (const row of rows) {
      await this.notificationsService.createForUserIfMissing(String(row.patientId), {
        reference: `appointment-disruption:${row.itemId}`,
        type: NotificationType.APPOINTMENT_DISRUPTION,
        title: 'Lịch khám của bạn bị ảnh hưởng',
        content: `Lịch #${row.appointmentId} tại ${row.facilityName} đã bị ảnh hưởng. Vui lòng chọn lịch khác hoặc hủy lịch.`,
        referenceType: NotificationReferenceType.SHIFT_DISRUPTION,
        referenceId: String(row.disruptionId),
      });
      await this.dataSource.query(
        `UPDATE user_schedules
         SET status = 'action_required', note = ?
         WHERE appointment_id = ? AND source = 'appointment'`,
        [row.reason || 'Ca trực bị hủy, vui lòng đổi lịch hoặc hủy lịch', row.appointmentId],
      );
      if (!row.notifiedAt) {
        await this.itemRepository.update(String(row.itemId), { notifiedAt: new Date() });
      }

      if (!row.emailSentAt && row.patientEmail) {
        try {
          await this.mailService.sendAppointmentDisruptionEmail({
            to: row.patientEmail,
            patientName: row.patientName,
            appointmentId: String(row.appointmentId),
            facilityName: row.facilityName,
            doctorName: row.doctorName,
            scheduledStart: new Date(row.oldScheduledStart),
            scheduledEnd: new Date(row.oldScheduledEnd),
            reason: row.reason || 'Cơ sở hoặc phòng khám tạm ngưng hoạt động',
            actionUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/schedule#appointment-disruptions`,
          });
          await this.itemRepository.update(String(row.itemId), { emailSentAt: new Date() });
        } catch (error) {
          this.logger.error(`Không gửi được email disruption item ${row.itemId}`, error);
        }
      }
    }

    const disruption = await this.dataSource.getRepository(ShiftDisruption).findOneBy({ id: disruptionId });
    if (disruption) {
      await this.notifyManagers(disruption, `${rows.length} lịch hẹn cần được thai phụ đổi hoặc hủy lịch.`);
    }
  }

  private buildListQuery() {
    return this.itemRepository
      .createQueryBuilder('item')
      .innerJoin('item.shiftDisruption', 'disruption')
      .innerJoin('item.appointment', 'appointment')
      .innerJoin('appointment.patient', 'patient')
      .innerJoin('appointment.facility', 'facility')
      .innerJoin('appointment.service', 'service')
      .leftJoin('appointment.doctor', 'doctor')
      .leftJoin('appointment.room', 'room')
      .select('item.id', 'id')
      .addSelect('item.appointmentId', 'appointmentId')
      .addSelect('item.resolutionStatus', 'resolutionStatus')
      .addSelect('item.selectedOption', 'selectedOption')
      .addSelect('item.resolutionNote', 'resolutionNote')
      .addSelect('item.oldScheduledStart', 'oldScheduledStart')
      .addSelect('item.oldScheduledEnd', 'oldScheduledEnd')
      .addSelect('item.createdAt', 'createdAt')
      .addSelect('disruption.id', 'disruptionId')
      .addSelect('disruption.reason', 'reason')
      .addSelect('disruption.status', 'disruptionStatus')
      .addSelect('facility.id', 'facilityId')
      .addSelect('facility.name', 'facilityName')
      .addSelect('service.name', 'serviceName')
      .addSelect('patient.name', 'patientName')
      .addSelect('patient.email', 'patientEmail')
      .addSelect('doctor.name', 'doctorName')
      .addSelect('room.name', 'roomName');
  }

  private async findOwnedItem(id: string, patientId: string) {
    const item = await this.itemRepository.findOne({
      where: { id, appointment: { patientId } },
      relations: { appointment: true, shiftDisruption: true },
    });
    if (!item) throw new NotFoundException('Không tìm thấy lịch bị ảnh hưởng');
    return item;
  }

  private assertPending(item: AppointmentDisruptionItem) {
    if (item.resolutionStatus !== AppointmentDisruptionResolutionStatus.PENDING) {
      throw new BadRequestException('Lịch bị ảnh hưởng này đã được chọn phương án xử lý');
    }
  }

  private assertCancellable(item: AppointmentDisruptionItem) {
    const cancellableStatuses = [
      AppointmentDisruptionResolutionStatus.PENDING,
      AppointmentDisruptionResolutionStatus.REFUND_PENDING,
    ];
    if (!cancellableStatuses.includes(item.resolutionStatus)) {
      throw new BadRequestException('Lịch bị ảnh hưởng này đã được xử lý');
    }
  }

  private async completeReschedule(item: AppointmentDisruptionItem, dto: RescheduleAppointmentDto, actorId: string) {
    const shift = await this.dataSource.query('SELECT staff_id AS staffId, room_id AS roomId FROM shifts WHERE id = ?', [dto.shiftId]);
    Object.assign(item, {
      resolutionStatus: AppointmentDisruptionResolutionStatus.RESCHEDULED,
      selectedOption: 'reschedule',
      newShiftId: dto.shiftId,
      newStaffId: shift[0]?.staffId ?? null,
      newRoomId: shift[0]?.roomId ?? null,
      newScheduledStart: new Date(`${dto.date}T${dto.startTime}`),
      newScheduledEnd: new Date(`${dto.date}T${dto.endTime}`),
      resolutionNote: dto.reason?.trim() || null,
      resolvedBy: actorId,
      resolvedAt: new Date(),
    });
    await this.itemRepository.save(item);
    await this.updateDisruptionStatus(item.disruptionId);
    await this.notificationsService.createForUserIfMissing(item.appointment.patientId, {
      reference: `appointment-rescheduled:${item.id}`,
      type: NotificationType.APPOINTMENT_DISRUPTION,
      title: 'Lịch khám đã được đổi',
      content: `Lịch #${item.appointmentId} đã được chuyển sang ${dto.date} ${dto.startTime.slice(0, 5)}.`,
      referenceType: NotificationReferenceType.SHIFT_DISRUPTION,
      referenceId: item.disruptionId,
    });
  }

  private async updateDisruptionStatus(disruptionId: string) {
    const [total, unresolved] = await Promise.all([
      this.itemRepository.count({ where: { disruptionId } }),
      this.itemRepository.count({ where: { disruptionId, resolutionStatus: In(UNRESOLVED_STATUSES) } }),
    ]);
    const status = unresolved === 0
      ? ShiftDisruptionStatus.RESOLVED
      : unresolved === total
        ? ShiftDisruptionStatus.OPEN
        : ShiftDisruptionStatus.PARTIALLY_RESOLVED;
    await this.dataSource.getRepository(ShiftDisruption).update(disruptionId, {
      status,
      resolvedAt: status === ShiftDisruptionStatus.RESOLVED ? new Date() : null,
    });
  }

  private async notifyManagers(disruption: ShiftDisruption, content: string) {
    const recipients = await this.dataSource.query(
      `
        SELECT DISTINCT staff.id
        FROM staffs staff
        LEFT JOIN staff_roles staffRole ON staffRole.staff_id = staff.id
        LEFT JOIN roles role ON role.id = staffRole.role_id
        LEFT JOIN facilities facility ON facility.id = ?
        WHERE staff.status = 'active'
          AND ((staff.facility_id = ? AND role.name = 'admin')
            OR staff.id = facility.owner_id)
      `,
      [disruption.facilityId, disruption.facilityId],
    );
    for (const recipient of recipients) {
      await this.notificationsService.createForStaffIfMissing(String(recipient.id), {
        reference: `shift-disruption:${disruption.id}`,
        type: NotificationType.APPOINTMENT_DISRUPTION,
        title: 'Có lịch hẹn bị ảnh hưởng',
        content,
        referenceType: NotificationReferenceType.SHIFT_DISRUPTION,
        referenceId: disruption.id,
      });
    }
  }

  private async getShiftStaffId(shiftId: string): Promise<string> {
    const rows = await this.dataSource.query('SELECT staff_id AS staffId FROM shifts WHERE id = ?', [shiftId]);
    return String(rows[0]?.staffId ?? '0');
  }

  private timeToMinutes(value: string) {
    const [hour = '0', minute = '0'] = String(value).split(':');
    return Number(hour) * 60 + Number(minute);
  }

  private minutesToTime(value: number) {
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}:00`;
  }

  private toDateText(value: string | Date) {
    if (typeof value === 'string') return value.slice(0, 10);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
}
