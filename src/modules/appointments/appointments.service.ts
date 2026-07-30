import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { ActiveStatus, AppointmentStatus, DoctorShiftStatus } from '../../common/constants/status.enum';
import { FacilityService } from '../facility-services/entities/facility-service.entity';
import { DoctorShift } from '../shifts/entities/shift.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { CreateAppointmentDto } from './dto/requests/create-appointment.dto';
import { CancelAppointmentDto } from './dto/requests/cancel-appointment.dto';
import { CheckInAppointmentDto } from './dto/requests/check-in-appointment.dto';
import { Appointment } from './entities/appointment.entity';
import { RescheduleAppointmentDto } from './dto/requests/reschedule-appointment.dto';
import { SearchAppointmentsDto } from './dto/requests/search-appointment.dto';

const ACTIVE_APPOINTMENT_STATUSES = [
  AppointmentStatus.PENDING_PAYMENT,
  AppointmentStatus.BOOKED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PROGRESS,
];

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function timeToMinutes(value: string) {
  const [hour = '0', minute = '0'] = normalizeTime(value).split(':');
  return Number(hour) * 60 + Number(minute);
}

function formatDateTime(date: string, time: string) {
  return `${date} ${normalizeTime(time)}`;
}

function toDateTimeParts(value: string | Date) {
  const text = value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')} ${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}:${String(value.getSeconds()).padStart(2, '0')}`
    : String(value);
  const [date = '', rawTime = ''] = text.includes('T')
    ? [text.slice(0, 10), text.slice(11, 19)]
    : text.split(' ');

  return {
    date,
    time: normalizeTime(rawTime).slice(0, 5),
  };
}

function overlaps(startA: string, endA: string, startB: string | Date, endB: string | Date) {
  const toTime = (value: string | Date) => {
    if (value instanceof Date) {
      return value.toTimeString().slice(0, 8);
    }

    const normalized = String(value);
    return normalizeTime(normalized.includes('T') ? normalized.split('T')[1].slice(0, 8) : normalized.split(' ')[1] ?? normalized);
  };

  return timeToMinutes(startA) < timeToMinutes(toTime(endB)) && timeToMinutes(endA) > timeToMinutes(toTime(startB));
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly schedulesService: SchedulesService,
  ) {}

  async createForPatient(patientId: string, dto: CreateAppointmentDto) {
    const startTime = normalizeTime(dto.startTime);
    const endTime = normalizeTime(dto.endTime);

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.END_TIME_AFTER_START_TIME);
    }

    return this.dataSource.transaction(async (manager) => {
      const [facilityService, shift] = await Promise.all([
        manager.getRepository(FacilityService).findOne({
          where: {
            facilityId: dto.facilityId,
            serviceId: dto.serviceId,
            status: ActiveStatus.ACTIVE,
          },
        }),
        manager.getRepository(DoctorShift).findOne({
          where: {
            id: dto.shiftId,
            facilityId: dto.facilityId,
            shiftDate: dto.date,
            status: DoctorShiftStatus.AVAILABLE,
          },
          lock: { mode: 'pessimistic_write' },
        }),
      ]);

      if (!facilityService) {
        throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.SERVICE_NOT_AVAILABLE_AT_FACILITY);
      }

      if (!shift) {
        throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.SHIFT_NOT_AVAILABLE);
      }

      if (!shift.roomId) {
        throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.SHIFT_ROOM_REQUIRED);
      }

      if (startTime < normalizeTime(shift.startTime) || endTime > normalizeTime(shift.endTime)) {
        throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.SLOT_OUTSIDE_SHIFT);
      }

      const doctorMatchesShift = await manager
        .createQueryBuilder()
        .select('doctor.id', 'id')
        .from('doctors', 'doctor')
        .where('doctor.id = :doctorId', { doctorId: dto.doctorId })
        .andWhere('doctor.staff_id = :staffId', { staffId: shift.staffId })
        .getRawOne<{ id: string }>();

      if (!doctorMatchesShift) {
        throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.DOCTOR_SHIFT_MISMATCH);
      }

      const activeAppointments = await manager
        .getRepository(Appointment)
        .createQueryBuilder('appointment')
        .where('appointment.facilityId = :facilityId', { facilityId: dto.facilityId })
        .andWhere('appointment.doctorId = :doctorId', { doctorId: shift.staffId })
        .andWhere('DATE(appointment.scheduledStart) = :date', { date: dto.date })
        .andWhere('appointment.status IN (:...statuses)', { statuses: ACTIVE_APPOINTMENT_STATUSES })
        .getMany();

      const hasOverlap = activeAppointments.some((appointment) =>
        overlaps(startTime, endTime, appointment.scheduledStart, appointment.scheduledEnd),
      );

      if (hasOverlap) {
        throw new ConflictException(RESPONSE_MESSAGES.APPOINTMENTS.SLOT_JUST_BOOKED);
      }

      const appointment = manager.getRepository(Appointment).create({
        patientId,
        pregnancyProfileId: null,
        facilityId: dto.facilityId,
        serviceId: dto.serviceId,
        doctorId: shift.staffId,
        roomId: shift.roomId,
        scheduledStart: formatDateTime(dto.date, startTime),
        scheduledEnd: formatDateTime(dto.date, endTime),
        status: AppointmentStatus.BOOKED,
        cancelReason: null,
        checkedInAt: null,
        noShowHandledAt: null,
        patientPackageId: null,
        patientExtraServiceId: null,
        createdBy: patientId,
      });

      const savedAppointment = await manager.getRepository(Appointment).save(appointment);
      const appointmentScheduleDetails = await manager
        .createQueryBuilder()
        .select('service.name', 'serviceName')
        .addSelect('facility.name', 'facilityName')
        .addSelect('facility.address', 'facilityAddress')
        .addSelect('doctorInfo.title', 'doctorTitle')
        .addSelect('staff.name', 'staffName')
        .from('appointments', 'appointment')
        .leftJoin('services', 'service', 'service.id = appointment.service_id')
        .leftJoin('facilities', 'facility', 'facility.id = appointment.facility_id')
        .leftJoin('staffs', 'staff', 'staff.id = appointment.doctor_id')
        .leftJoin('doctors', 'doctorInfo', 'doctorInfo.staff_id = staff.id')
        .where('appointment.id = :appointmentId', { appointmentId: savedAppointment.id })
        .getRawOne<{
          serviceName?: string;
          facilityName?: string;
          facilityAddress?: string;
          doctorTitle?: string;
          staffName?: string;
        }>();

      await this.schedulesService.createForAppointment(manager, {
        userId: patientId,
        appointmentId: savedAppointment.id,
        title: appointmentScheduleDetails?.serviceName
          ? `Khám: ${appointmentScheduleDetails.serviceName}`
          : 'Lịch khám',
        date: dto.date,
        time: startTime,
        location:
          appointmentScheduleDetails?.facilityName ??
          appointmentScheduleDetails?.facilityAddress ??
          null,
        doctor: [appointmentScheduleDetails?.doctorTitle, appointmentScheduleDetails?.staffName]
          .filter(Boolean)
          .join(' ') || null,
        note: 'Lịch được tạo tự động sau khi đặt lịch khám.',
        type: 'checkup',
      });

      return savedAppointment;
    });
  }

  async findManagement(query: SearchAppointmentsDto, actorId: string, scopedFacilityId?: string | null) {
    const qb = this.buildManagementQuery();

    if (scopedFacilityId) {
      qb.andWhere('appointment.facility_id = :scopedFacilityId', { scopedFacilityId });
    } else if (query.facilityId) {
      qb.andWhere('appointment.facility_id = :facilityId', { facilityId: query.facilityId });
    }
    if (query.doctorId) qb.andWhere('doctor.id = :doctorId', { doctorId: query.doctorId });
    if (query.patientId) qb.andWhere('appointment.patient_id = :patientId', { patientId: query.patientId });
    if (query.status) qb.andWhere('appointment.status = :status', { status: query.status });
    if (query.dateFrom) qb.andWhere('DATE(appointment.scheduled_start) >= :dateFrom', { dateFrom: query.dateFrom });
    if (query.dateTo) qb.andWhere('DATE(appointment.scheduled_start) <= :dateTo', { dateTo: query.dateTo });
    if (query.scope === 'mine') qb.andWhere('appointment.doctor_id = :actorId', { actorId });
    if (query.search?.trim()) {
      const keyword = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        `(
          LOWER(CAST(appointment.id AS CHAR)) LIKE :keyword
          OR LOWER(CAST(patient.id AS CHAR)) LIKE :keyword
          OR LOWER(COALESCE(patient.name, '')) LIKE :keyword
          OR LOWER(COALESCE(patient.phone, '')) LIKE :keyword
          OR LOWER(COALESCE(patient.email, '')) LIKE :keyword
          OR LOWER(COALESCE(service.name, '')) LIKE :keyword
          OR LOWER(COALESCE(staff.name, '')) LIKE :keyword
          OR LOWER(COALESCE(facility.name, '')) LIKE :keyword
          OR LOWER(COALESCE(profile.code, '')) LIKE :keyword
        )`,
        { keyword },
      );
    }

    const rows = await qb
      .orderBy('appointment.created_at', 'DESC')
      .addOrderBy('appointment.id', 'DESC')
      .getRawMany();
    return rows.map((row) => this.normalizeManagementAppointment(row));
  }

  async findManagementById(id: string, scopedFacilityId?: string | null) {
    const qb = this.buildManagementQuery()
      .andWhere('appointment.id = :id', { id })
    if (scopedFacilityId) {
      qb.andWhere('appointment.facility_id = :scopedFacilityId', { scopedFacilityId });
    }
    const row = await qb.getRawOne();

    if (!row) throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
    return this.normalizeManagementAppointment(row);
  }

  async checkIn(id: string, dto: CheckInAppointmentDto, scopedFacilityId?: string | null) {
    return this.dataSource.transaction(async (manager) => {
      const appointment = await manager.getRepository(Appointment).findOne({ where: { id } });
      if (!appointment) throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
      this.assertAppointmentFacility(appointment, scopedFacilityId);
      if ([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW, AppointmentStatus.COMPLETED].includes(appointment.status)) {
        throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.CHECK_IN_STATUS_INVALID);
      }

      const profile = await manager
        .createQueryBuilder()
        .select('profile.id', 'id')
        .from('pregnancy_profiles', 'profile')
        .where('profile.id = :profileId', { profileId: dto.pregnancyProfileId })
        .andWhere('profile.patient_id = :patientId', { patientId: appointment.patientId })
        .andWhere('profile.deleted_at IS NULL')
        .getRawOne<{ id: string }>();
      if (!profile) throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.PROFILE_NOT_BELONG_TO_PATIENT);

      if (dto.doctorId) {
        const shift = await this.findShiftForDoctor(
          manager,
          dto.doctorId,
          appointment.facilityId,
          toDateTimeParts(appointment.scheduledStart).date,
          toDateTimeParts(appointment.scheduledStart).time,
          toDateTimeParts(appointment.scheduledEnd).time,
        );
        appointment.doctorId = shift.staffId;
        appointment.roomId = shift.roomId ?? appointment.roomId;
      }

      appointment.pregnancyProfileId = dto.pregnancyProfileId;
      appointment.checkedInAt = new Date();
      appointment.status = AppointmentStatus.CHECKED_IN;
      await manager.getRepository(Appointment).save(appointment);
      return this.findManagementById(id, scopedFacilityId);
    });
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto, scopedFacilityId?: string | null) {
    return this.dataSource.transaction(async (manager) => {
      const appointment = await manager.getRepository(Appointment).findOne({ where: { id } });
      if (!appointment) throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
      this.assertAppointmentFacility(appointment, scopedFacilityId);
      const startTime = normalizeTime(dto.startTime);
      const endTime = normalizeTime(dto.endTime);
      if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.END_TIME_AFTER_START_TIME);
      }
      const shift = await this.findShiftForDoctor(manager, dto.doctorId, appointment.facilityId, dto.date, startTime, endTime);
      await this.ensureSlotFree(manager, appointment.facilityId, shift.staffId, dto.date, startTime, endTime, id);

      appointment.doctorId = shift.staffId;
      appointment.roomId = shift.roomId ?? appointment.roomId;
      appointment.scheduledStart = formatDateTime(dto.date, startTime);
      appointment.scheduledEnd = formatDateTime(dto.date, endTime);
      appointment.status = AppointmentStatus.RESCHEDULED;
      appointment.cancelReason = dto.reason?.trim() || null;
      await manager.getRepository(Appointment).save(appointment);
      await this.syncAppointmentSchedule(manager, appointment.id);
      return this.findManagementById(id, scopedFacilityId);
    });
  }

  async cancel(id: string, dto: CancelAppointmentDto, scopedFacilityId?: string | null) {
    return this.updateStatus(id, AppointmentStatus.CANCELLED, dto.reason, undefined, scopedFacilityId);
  }

  async noShow(id: string, dto: CancelAppointmentDto, scopedFacilityId?: string | null) {
    return this.updateStatus(id, AppointmentStatus.NO_SHOW, dto.reason, { noShowHandledAt: new Date() }, scopedFacilityId);
  }

  async complete(id: string, scopedFacilityId?: string | null) {
    return this.updateStatus(id, AppointmentStatus.COMPLETED, undefined, undefined, scopedFacilityId);
  }

  private async updateStatus(
    id: string,
    status: AppointmentStatus,
    reason?: string,
    extra?: Partial<Appointment>,
    scopedFacilityId?: string | null,
  ) {
    const appointment = await this.dataSource.getRepository(Appointment).findOne({ where: { id } });
    if (!appointment) throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
    this.assertAppointmentFacility(appointment, scopedFacilityId);
    appointment.status = status;
    appointment.cancelReason = reason?.trim() || appointment.cancelReason;
    Object.assign(appointment, extra);
    await this.dataSource.getRepository(Appointment).save(appointment);
    return this.findManagementById(id, scopedFacilityId);
  }

  private assertAppointmentFacility(appointment: Appointment, scopedFacilityId?: string | null) {
    if (scopedFacilityId && String(appointment.facilityId) !== String(scopedFacilityId)) {
      throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND_IN_FACILITY);
    }
  }

  private buildManagementQuery() {
    return this.dataSource
      .createQueryBuilder()
      .select('appointment.id', 'id')
      .addSelect('appointment.patient_id', 'patientId')
      .addSelect('appointment.pregnancy_profile_id', 'pregnancyProfileId')
      .addSelect('appointment.facility_id', 'facilityId')
      .addSelect('appointment.service_id', 'serviceId')
      .addSelect('appointment.doctor_id', 'doctorStaffId')
      .addSelect('appointment.room_id', 'roomId')
      .addSelect('appointment.scheduled_start', 'scheduledStart')
      .addSelect('appointment.scheduled_end', 'scheduledEnd')
      .addSelect('appointment.checked_in_at', 'checkedInAt')
      .addSelect('appointment.status', 'status')
      .addSelect('appointment.cancel_reason', 'cancelReason')
      .addSelect('appointment.created_at', 'createdAt')
      .addSelect('patient.name', 'patientName')
      .addSelect('patient.phone', 'patientPhone')
      .addSelect('patient.email', 'patientEmail')
      .addSelect('facility.name', 'facilityName')
      .addSelect('service.name', 'serviceName')
      .addSelect('room.name', 'roomName')
      .addSelect('doctor.id', 'doctorId')
      .addSelect('doctor.title', 'doctorTitle')
      .addSelect('staff.name', 'doctorName')
      .addSelect('profile.code', 'pregnancyProfileCode')
      .from('appointments', 'appointment')
      .leftJoin('users', 'patient', 'patient.id = appointment.patient_id')
      .leftJoin('facilities', 'facility', 'facility.id = appointment.facility_id')
      .leftJoin('services', 'service', 'service.id = appointment.service_id')
      .leftJoin('rooms', 'room', 'room.id = appointment.room_id')
      .leftJoin('staffs', 'staff', 'staff.id = appointment.doctor_id')
      .leftJoin('doctors', 'doctor', 'doctor.staff_id = staff.id')
      .leftJoin('pregnancy_profiles', 'profile', 'profile.id = appointment.pregnancy_profile_id');
  }

  private normalizeManagementAppointment(row: Record<string, unknown>) {
    const start = toDateTimeParts(row.scheduledStart as string | Date);
    const end = toDateTimeParts(row.scheduledEnd as string | Date);
    return {
      ...row,
      id: String(row.id ?? ''),
      patientId: String(row.patientId ?? ''),
      pregnancyProfileId: row.pregnancyProfileId ? String(row.pregnancyProfileId) : null,
      facilityId: String(row.facilityId ?? ''),
      serviceId: String(row.serviceId ?? ''),
      doctorId: row.doctorId ? String(row.doctorId) : null,
      doctorStaffId: row.doctorStaffId ? String(row.doctorStaffId) : null,
      roomId: String(row.roomId ?? ''),
      date: start.date,
      startTime: start.time,
      endTime: end.time,
      status: String(row.status ?? ''),
    };
  }

  private async findShiftForDoctor(
    manager: EntityManager,
    doctorId: string,
    facilityId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) {
    const shift = await manager
      .createQueryBuilder()
      .select('shift.id', 'id')
      .addSelect('shift.staff_id', 'staffId')
      .addSelect('shift.room_id', 'roomId')
      .from('shifts', 'shift')
      .innerJoin('doctors', 'doctor', 'doctor.staff_id = shift.staff_id')
      .where('doctor.id = :doctorId', { doctorId })
      .andWhere('shift.facility_id = :facilityId', { facilityId })
      .andWhere('shift.shift_date = :date', { date })
      .andWhere('shift.status = :status', { status: DoctorShiftStatus.AVAILABLE })
      .andWhere('shift.start_time <= :startTime', { startTime })
      .andWhere('shift.end_time >= :endTime', { endTime })
      .getRawOne<{ id: string; staffId: string; roomId: string | null }>();
    if (!shift) throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.DOCTOR_SHIFT_NOT_AVAILABLE);
    return shift;
  }

  private async ensureSlotFree(
    manager: EntityManager,
    facilityId: string,
    doctorStaffId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ) {
    const qb = manager
      .getRepository(Appointment)
      .createQueryBuilder('appointment')
      .where('appointment.facilityId = :facilityId', { facilityId })
      .andWhere('appointment.doctorId = :doctorStaffId', { doctorStaffId })
      .andWhere('DATE(appointment.scheduledStart) = :date', { date })
      .andWhere('appointment.status IN (:...statuses)', { statuses: ACTIVE_APPOINTMENT_STATUSES });
    if (excludeAppointmentId) qb.andWhere('appointment.id != :excludeAppointmentId', { excludeAppointmentId });
    const activeAppointments = await qb.getMany();
    if (activeAppointments.some((appointment) => overlaps(startTime, endTime, appointment.scheduledStart, appointment.scheduledEnd))) {
      throw new ConflictException(RESPONSE_MESSAGES.APPOINTMENTS.SLOT_CONFLICT);
    }
  }

  private async syncAppointmentSchedule(
    manager: EntityManager,
    appointmentId: string,
  ) {
    await manager.query(
      `
      UPDATE user_schedules schedule
      INNER JOIN appointments appointment
        ON appointment.id = schedule.appointment_id
      LEFT JOIN facilities facility
        ON facility.id = appointment.facility_id
      LEFT JOIN staffs staff
        ON staff.id = appointment.doctor_id
      LEFT JOIN doctors doctor
        ON doctor.staff_id = staff.id
      SET
        schedule.schedule_date = DATE(appointment.scheduled_start),
        schedule.schedule_time = TIME(appointment.scheduled_start),
        schedule.location = COALESCE(facility.name, facility.address, schedule.location),
        schedule.doctor = NULLIF(TRIM(CONCAT_WS(' ', doctor.title, staff.name)), ''),
        schedule.updated_at = CURRENT_TIMESTAMP
      WHERE schedule.appointment_id = ?
        AND schedule.source = 'appointment'
      `,
      [appointmentId],
    );
  }
}
