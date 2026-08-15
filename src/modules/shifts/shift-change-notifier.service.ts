import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificationReferenceType, NotificationType } from '../../common/constants/notification.enum';
import { AppointmentStatus } from '../../common/constants/status.enum';
import { IMailService, MAIL_SERVICE } from '../mail/interfaces/mail-service.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { DoctorShift } from './entities/shift.entity';
import { ShiftUpdateChanges } from './interfaces/shift-update.interface';

interface ShiftAppointmentRecipient {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  facilityName: string;
  oldDoctorName: string;
  newDoctorName: string;
  roomName: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
}

@Injectable()
export class ShiftChangeNotifierService {
  private readonly logger = new Logger(ShiftChangeNotifierService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    @Inject(MAIL_SERVICE) private readonly mailService: IMailService,
  ) {}

  /** Gửi thông báo sau khi transaction cập nhật ca và appointment đã hoàn tất. */
  async notifyAppointments(
    before: DoctorShift,
    after: DoctorShift,
    changes: ShiftUpdateChanges,
    changeLogId: string,
    reason?: string | null,
  ): Promise<void> {
    if (!changes.assigneeChanged && !changes.roomChanged) return;

    const recipients = await this.findRecipients(after.id, before.staffId, after.staffId);
    for (const recipient of recipients) {
      await this.createPatientNotification(recipient, changes, changeLogId);
      if (changes.assigneeChanged) {
        await this.sendDoctorChangedEmail(recipient, reason);
      }
    }
  }

  private async createPatientNotification(
    recipient: ShiftAppointmentRecipient,
    changes: ShiftUpdateChanges,
    changeLogId: string,
  ) {
    const title = changes.assigneeChanged ? 'Bác sĩ phụ trách đã thay đổi' : 'Phòng khám đã thay đổi';
    const content = changes.assigneeChanged
      ? `Lịch #${recipient.appointmentId} đã đổi từ ${recipient.oldDoctorName} sang ${recipient.newDoctorName}.`
      : `Lịch #${recipient.appointmentId} đã được chuyển sang ${recipient.roomName ?? 'phòng khám mới'}.`;

    await this.notificationsService.createForUserIfMissing(recipient.patientId, {
      reference: `shift-change:${changeLogId}:appointment:${recipient.appointmentId}`,
      type: NotificationType.APPOINTMENT,
      title,
      content,
      referenceType: NotificationReferenceType.APPOINTMENT,
      referenceId: recipient.appointmentId,
    });
  }

  private async sendDoctorChangedEmail(recipient: ShiftAppointmentRecipient, reason?: string | null) {
    if (!recipient.patientEmail) return;

    try {
      await this.mailService.sendAppointmentDoctorChangedEmail({
        to: recipient.patientEmail,
        patientName: recipient.patientName,
        appointmentId: recipient.appointmentId,
        facilityName: recipient.facilityName,
        oldDoctorName: recipient.oldDoctorName,
        newDoctorName: recipient.newDoctorName,
        scheduledStart: new Date(recipient.scheduledStart),
        scheduledEnd: new Date(recipient.scheduledEnd),
        reason,
        actionUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/appointments`,
      });
    } catch (error) {
      this.logger.error(`Không gửi được email đổi bác sĩ cho lịch ${recipient.appointmentId}`, error);
    }
  }

  private findRecipients(shiftId: string, oldStaffId: string, newStaffId: string) {
    const activeStatuses = [
      AppointmentStatus.PENDING_PAYMENT,
      AppointmentStatus.BOOKED,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.RESCHEDULED,
      AppointmentStatus.CHECKED_IN,
      AppointmentStatus.IN_PROGRESS,
    ];

    return this.dataSource.createQueryBuilder()
      .select('appointment.id', 'appointmentId')
      .addSelect('patient.id', 'patientId')
      .addSelect('patient.name', 'patientName')
      .addSelect('patient.email', 'patientEmail')
      .addSelect('facility.name', 'facilityName')
      .addSelect('oldStaff.name', 'oldDoctorName')
      .addSelect('newStaff.name', 'newDoctorName')
      .addSelect('room.name', 'roomName')
      .addSelect('appointment.scheduled_start', 'scheduledStart')
      .addSelect('appointment.scheduled_end', 'scheduledEnd')
      .from('appointments', 'appointment')
      .innerJoin('users', 'patient', 'patient.id = appointment.patient_id')
      .innerJoin('facilities', 'facility', 'facility.id = appointment.facility_id')
      .innerJoin('staffs', 'oldStaff', 'oldStaff.id = :oldStaffId', { oldStaffId })
      .innerJoin('staffs', 'newStaff', 'newStaff.id = :newStaffId', { newStaffId })
      .leftJoin('rooms', 'room', 'room.id = appointment.room_id')
      .where('appointment.shift_id = :shiftId', { shiftId })
      .andWhere('appointment.status IN (:...activeStatuses)', { activeStatuses })
      .getRawMany<ShiftAppointmentRecipient>();
  }
}
