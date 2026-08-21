import { PregnancyProfile } from './../pregnancy-profile/entities/pregnancy-profile.entity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import {
  ActiveStatus,
  AppointmentStatus,
  DoctorShiftStatus,
} from '../../common/constants/status.enum';
import { FacilityService } from '../facility-services/entities/facility-service.entity';
import { Room } from '../rooms/entities/room.entity';
import { DoctorShift } from '../shifts/entities/shift.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { CreateAppointmentDto } from './dto/requests/create-appointment.dto';
import { CancelAppointmentDto } from './dto/requests/cancel-appointment.dto';
import { CheckInAppointmentDto } from './dto/requests/check-in-appointment.dto';
import { Appointment } from './entities/appointment.entity';
import { RescheduleAppointmentDto } from './dto/requests/reschedule-appointment.dto';
import { SearchAppointmentsDto } from './dto/requests/search-appointment.dto';
import { SearchProfileQueryDto } from '../pregnancy-profile/dto/request/search-pregnancy-profiles.dto';
import {
  AddAppointmentServiceItemsDto,
  CheckInAppointmentServiceItemDto,
  SetServiceResultExpectedAtDto,
} from './dto/requests/appointment-service-item.dto';
import {
  AppointmentServiceItem,
  AppointmentServiceItemStatus,
} from './entities/appointment-service-item.entity';

const ACTIVE_APPOINTMENT_STATUSES = [
  AppointmentStatus.PENDING_PAYMENT,
  AppointmentStatus.BOOKED,
  AppointmentStatus.CONFIRMED,
  // Lịch đã đổi vẫn đang giữ chỗ ở ca mới.
  AppointmentStatus.RESCHEDULED,
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

function isPastDateTime(date: string, time: string) {
  return new Date(`${date}T${normalizeTime(time)}`).getTime() <= Date.now();
}

function normalizeSearchText(value?: string | null) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getServiceSpecialtyKeyword(serviceTypeCode?: string | null, serviceTypeName?: string | null) {
  const code = normalizeSearchText(serviceTypeCode).replace(/[^a-z0-9]+/g, '_');
  const name = normalizeSearchText(serviceTypeName);

  if (code.includes('ultrasound') || name.includes('sieu am')) return 'sieu am';
  if (code.includes('lab_test') || code.includes('lab') || name.includes('xet nghiem')) {
    return 'xet nghiem';
  }
  if (code.includes('screening') || name.includes('sang loc')) return 'xet nghiem';
  if (code.includes('procedure') || name.includes('thu thuat')) return 'thu thuat';
  if (code.includes('consultation') || name.includes('kham')) return 'san phu khoa';

  return '';
}

function getSpecialtyKeywordFromText(value?: string | null) {
  const text = normalizeSearchText(value);
  if (text.includes('phu san') || text.includes('san phu')) return 'san phu khoa';
  if (text.includes('sieu am')) return 'sieu am';
  if (text.includes('xet nghiem') || text.includes('sang loc')) return 'xet nghiem';
  if (text.includes('thu thuat')) return 'thu thuat';
  if (text.includes('theo doi thai')) return 'san phu khoa';
  return text;
}

function isObstetricsSpecialty(value?: string | null) {
  return getSpecialtyKeywordFromText(value) === 'san phu khoa';
}

function toDateTimeParts(value: string | Date) {
  const text =
    value instanceof Date
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
    return normalizeTime(
      normalized.includes('T')
        ? normalized.split('T')[1].slice(0, 8)
        : (normalized.split(' ')[1] ?? normalized),
    );
  };

  return (
    timeToMinutes(startA) < timeToMinutes(toTime(endB)) &&
    timeToMinutes(endA) > timeToMinutes(toTime(startB))
  );
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
    if (isPastDateTime(dto.date, startTime)) {
      throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.PAST_SLOT_INVALID);
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
        throw new BadRequestException(
          RESPONSE_MESSAGES.APPOINTMENTS.SERVICE_NOT_AVAILABLE_AT_FACILITY,
        );
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
        .addSelect('doctor.specialty', 'specialty')
        .from('doctors', 'doctor')
        .where('doctor.id = :doctorId', { doctorId: dto.doctorId })
        .andWhere('doctor.staff_id = :staffId', { staffId: shift.staffId })
        .getRawOne<{ id: string; specialty?: string | null }>();

      if (!doctorMatchesShift) {
        throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.DOCTOR_SHIFT_MISMATCH);
      }

      const serviceSpecialty = await manager
        .createQueryBuilder()
        .select('service.allow_doctor_selection', 'allowDoctorSelection')
        .addSelect('service.doctor_specialty', 'doctorSpecialty')
        .addSelect('serviceType.code', 'code')
        .addSelect('serviceType.name', 'name')
        .from('services', 'service')
        .innerJoin('service_types', 'serviceType', 'serviceType.id = service.service_type_id')
        .where('service.id = :serviceId', { serviceId: dto.serviceId })
        .getRawOne<{
          allowDoctorSelection?: boolean | number | string | null;
          doctorSpecialty?: string | null;
          code?: string | null;
          name?: string | null;
        }>();
      const allowDoctorSelection =
        serviceSpecialty?.allowDoctorSelection === true ||
        serviceSpecialty?.allowDoctorSelection === 1 ||
        serviceSpecialty?.allowDoctorSelection === '1';
      const specialtyKeyword = allowDoctorSelection
        ? normalizeSearchText(serviceSpecialty?.doctorSpecialty)
        : '';

      if (
        specialtyKeyword &&
        !normalizeSearchText(doctorMatchesShift.specialty).includes(specialtyKeyword)
      ) {
        throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.DOCTOR_SPECIALTY_MISMATCH);
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
        shiftId: shift.id,
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
        doctor:
          [appointmentScheduleDetails?.doctorTitle, appointmentScheduleDetails?.staffName]
            .filter(Boolean)
            .join(' ') || null,
        note: 'Lịch được tạo tự động sau khi đặt lịch khám.',
        type: 'checkup',
      });

      return savedAppointment;
    });
  }

  async getPregnancyProfilesOfDoctor(
    doctorId: string | null,
    query: SearchProfileQueryDto,
    scopedFacilityId?: string | null,
  ) {
    const { patientId, name, code, phone, email, status, page = 1, limit = 20 } = query;
    const appointmentConditions = [
      'appointment.status = :appointmentStatus',
      'appointment.checkedInAt IS NOT NULL',
      'appointment.checkedInAt < :now',
    ];
    const appointmentParams: Record<string, string | Date> = {
      appointmentStatus: AppointmentStatus.COMPLETED,
      now: new Date(),
    };

    if (doctorId) {
      appointmentConditions.unshift('appointment.doctorId = :doctorId');
      appointmentParams.doctorId = doctorId;
    }

    if (scopedFacilityId) {
      appointmentConditions.unshift('appointment.facilityId = :scopedFacilityId');
      appointmentParams.scopedFacilityId = scopedFacilityId;
    }

    const queryBuilder = this.dataSource
      .getRepository(PregnancyProfile)
      .createQueryBuilder('pregnancyProfile')
      .innerJoin(
        'pregnancyProfile.appointments',
        'appointment',
        appointmentConditions.join(' AND '),
        appointmentParams,
      )
      .leftJoinAndSelect('pregnancyProfile.patient', 'patient')
      .distinct(true);

    if (patientId) {
      queryBuilder.andWhere('pregnancyProfile.patientId = :patientId', {
        patientId,
      });
    }

    if (name?.trim()) {
      queryBuilder.andWhere('LOWER(patient.name) LIKE LOWER(:name)', {
        name: `%${name.trim()}%`,
      });
    }

    if (code?.trim()) {
      queryBuilder.andWhere('LOWER(pregnancyProfile.code) LIKE LOWER(:code)', {
        code: `%${code.trim()}%`,
      });
    }

    if (phone?.trim()) {
      queryBuilder.andWhere('patient.phone LIKE :phone', {
        phone: `%${phone.trim()}%`,
      });
    }

    if (email?.trim()) {
      queryBuilder.andWhere('LOWER(patient.email) LIKE LOWER(:email)', {
        email: `%${email.trim()}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere('pregnancyProfile.status = :profileStatus', {
        profileStatus: status,
      });
    }

    queryBuilder
      .orderBy('pregnancyProfile.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
    };
  }

  async getAppointmentOfDoctorAndPregnancyProfile(
    doctorId: string | null,
    pregnancyProfileId: string,
    scopedFacilityId?: string | null,
  ) {
    const appointmentRepository = this.dataSource.getRepository(Appointment);
    const queryBuilder = appointmentRepository
      .createQueryBuilder('appointment')
      .where('appointment.pregnancyProfileId = :pregnancyProfileId', { pregnancyProfileId })
      .andWhere('appointment.status =:status', { status: AppointmentStatus.COMPLETED })
      .andWhere('appointment.checkedInAt IS NOT NULL')
      .andWhere('appointment.checkedInAt < :now', { now: new Date() })
      .orderBy('appointment.checkedInAt', 'DESC');

    if (doctorId) {
      queryBuilder.andWhere('appointment.doctorId = :doctorId', { doctorId });
    }

    if (scopedFacilityId) {
      queryBuilder.andWhere('appointment.facilityId = :scopedFacilityId', { scopedFacilityId });
    }

    return await queryBuilder.getMany();
  }

  async findManagement(
    query: SearchAppointmentsDto,
    actorId: string,
    scopedFacilityId?: string | null,
    actorIsDoctor = false,
  ) {
    const qb = this.buildManagementQuery();
    if (actorIsDoctor) {
      await this.assertObstetricsDoctor(actorId);
      qb.andWhere('appointment.doctor_id = :actorId', { actorId });
      qb.andWhere('appointment.checked_in_at IS NOT NULL');
    }

    if (scopedFacilityId) {
      qb.andWhere('appointment.facility_id = :scopedFacilityId', { scopedFacilityId });
    } else if (query.facilityId) {
      qb.andWhere('appointment.facility_id = :facilityId', { facilityId: query.facilityId });
    }
    if (query.doctorId) qb.andWhere('doctor.id = :doctorId', { doctorId: query.doctorId });
    if (query.patientId)
      qb.andWhere('appointment.patient_id = :patientId', { patientId: query.patientId });
    if (query.status) qb.andWhere('appointment.status = :status', { status: query.status });
    if (query.dateFrom)
      qb.andWhere('DATE(appointment.scheduled_start) >= :dateFrom', { dateFrom: query.dateFrom });
    if (query.dateTo)
      qb.andWhere('DATE(appointment.scheduled_start) <= :dateTo', { dateTo: query.dateTo });
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

  async findManagementById(
    id: string,
    scopedFacilityId?: string | null,
    actorId?: string,
    actorIsDoctor = false,
  ) {
    if (actorIsDoctor && actorId) await this.assertObstetricsDoctor(actorId);
    const qb = this.buildManagementQuery().andWhere('appointment.id = :id', { id });
    if (actorIsDoctor && actorId) {
      qb.andWhere('appointment.doctor_id = :actorId', { actorId });
      qb.andWhere('appointment.checked_in_at IS NOT NULL');
    }
    if (scopedFacilityId) {
      qb.andWhere('appointment.facility_id = :scopedFacilityId', { scopedFacilityId });
    }
    const row = await qb.getRawOne();

    if (!row) throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
    return this.normalizeManagementAppointment(row);
  }

  async findServiceItems(
    appointmentId: string,
    scopedFacilityId?: string | null,
    actorId?: string,
    actorIsDoctor = false,
  ) {
    if (actorIsDoctor && actorId) await this.assertObstetricsDoctor(actorId);
    await this.findAppointmentOrFail(
      appointmentId,
      scopedFacilityId,
      undefined,
      actorIsDoctor ? actorId : undefined,
      actorIsDoctor,
    );
    return this.buildServiceItemsQuery(appointmentId).getRawMany();
  }

  async findSpecialistServiceItems(actorId: string, scopedFacilityId?: string | null) {
    const qb = this.buildServiceItemsQuery().andWhere('item.doctor_id = :actorId', { actorId });

    if (scopedFacilityId) {
      qb.andWhere('appointment.facility_id = :scopedFacilityId', { scopedFacilityId });
    }

    return qb.getRawMany();
  }

  async addServiceItems(
    appointmentId: string,
    dto: AddAppointmentServiceItemsDto,
    scopedFacilityId?: string | null,
    actorId?: string,
    actorIsDoctor = false,
  ) {
    if (actorIsDoctor && actorId) await this.assertObstetricsDoctor(actorId);
    return this.dataSource.transaction(async (manager) => {
      const appointment = await this.findAppointmentOrFail(
        appointmentId,
        scopedFacilityId,
        manager,
        actorIsDoctor ? actorId : undefined,
        actorIsDoctor,
      );
      const maxSequence = await manager
        .getRepository(AppointmentServiceItem)
        .createQueryBuilder('item')
        .select('COALESCE(MAX(item.sequence), 0)', 'max')
        .where('item.appointmentId = :appointmentId', { appointmentId })
        .getRawOne<{ max: string | number }>();

      let sequence = Number(maxSequence?.max ?? 0);
      const created: AppointmentServiceItem[] = [];
      for (const item of dto.items) {
        const facilityService = await manager.getRepository(FacilityService).findOne({
          where: {
            facilityId: appointment.facilityId,
            serviceId: item.serviceId,
            status: ActiveStatus.ACTIVE,
          },
        });
        if (!facilityService) {
          throw new BadRequestException(
            RESPONSE_MESSAGES.APPOINTMENTS.SERVICE_NOT_AVAILABLE_AT_FACILITY,
          );
        }
        await this.ensureServiceRoomAvailable(manager, item.roomId, appointment.facilityId);
        await this.ensureDoctorShiftForServiceRoom(
          manager,
          item.doctorId,
          appointment.facilityId,
          item.roomId,
          toDateTimeParts(appointment.scheduledStart).date,
        );
        sequence += 1;
        created.push(
          manager.getRepository(AppointmentServiceItem).create({
            appointmentId,
            serviceId: item.serviceId,
            facilityServiceId: facilityService.id,
            doctorId: item.doctorId,
            roomId: item.roomId,
            sequence,
            status: AppointmentServiceItemStatus.ORDERED,
            checkedInAt: null,
            calledAt: null,
            startedAt: null,
            resultExpectedAt: null,
            resultUploadedAt: null,
            completedAt: null,
            note: item.note?.trim() || null,
          }),
        );
      }

      await manager.getRepository(AppointmentServiceItem).save(created);
      return this.findServiceItems(appointmentId, scopedFacilityId);
    });
  }

  async checkInServiceItem(
    appointmentId: string,
    itemId: string,
    dto: CheckInAppointmentServiceItemDto,
    scopedFacilityId?: string | null,
    actorId?: string,
    actorIsDoctor = false,
  ) {
    const item = await this.findServiceItemOrFail(appointmentId, itemId, scopedFacilityId);
    if (actorIsDoctor && actorId) await this.assertSpecialistCanAccessItem(itemId, actorId);
    this.assertServiceItemMutable(item);
    if (dto.roomId) {
      const appointment = await this.findAppointmentOrFail(appointmentId, scopedFacilityId);
      await this.ensureServiceRoomAvailable(
        this.dataSource.manager,
        dto.roomId,
        appointment.facilityId,
      );
    }
    item.doctorId = dto.doctorId ?? item.doctorId;
    item.roomId = dto.roomId ?? item.roomId;
    item.checkedInAt = new Date();
    item.status = AppointmentServiceItemStatus.WAITING;
    await this.dataSource.getRepository(AppointmentServiceItem).save(item);
    await this.updateAppointmentInProgress(appointmentId);
    return this.getServiceItemDetail(appointmentId, itemId, scopedFacilityId);
  }

  async callServiceItem(
    appointmentId: string,
    itemId: string,
    scopedFacilityId?: string | null,
    actorId?: string,
    actorIsDoctor = false,
  ) {
    const item = await this.findServiceItemOrFail(appointmentId, itemId, scopedFacilityId);
    if (actorIsDoctor && actorId) await this.assertSpecialistCanAccessItem(itemId, actorId);
    this.assertServiceItemMutable(item);
    item.calledAt = new Date();
    item.status = AppointmentServiceItemStatus.CALLED;
    await this.dataSource.getRepository(AppointmentServiceItem).save(item);
    return this.getServiceItemDetail(appointmentId, itemId, scopedFacilityId);
  }

  async startServiceItem(
    appointmentId: string,
    itemId: string,
    scopedFacilityId?: string | null,
    actorId?: string,
    actorIsDoctor = false,
  ) {
    const item = await this.findServiceItemOrFail(appointmentId, itemId, scopedFacilityId);
    if (actorIsDoctor && actorId) await this.assertSpecialistCanAccessItem(itemId, actorId);
    this.assertServiceItemMutable(item);
    item.startedAt = new Date();
    item.status = AppointmentServiceItemStatus.IN_PROGRESS;
    await this.dataSource.getRepository(AppointmentServiceItem).save(item);
    return this.getServiceItemDetail(appointmentId, itemId, scopedFacilityId);
  }

  async setServiceResultExpectedAt(
    appointmentId: string,
    itemId: string,
    dto: SetServiceResultExpectedAtDto,
    scopedFacilityId?: string | null,
    actorId?: string,
    actorIsDoctor = false,
  ) {
    const item = await this.findServiceItemOrFail(appointmentId, itemId, scopedFacilityId);
    if (actorIsDoctor && actorId) await this.assertSpecialistCanAccessItem(itemId, actorId);
    this.assertServiceItemMutable(item);
    item.resultExpectedAt = new Date(dto.resultExpectedAt);
    item.status = AppointmentServiceItemStatus.WAITING_RESULT;
    await this.dataSource.getRepository(AppointmentServiceItem).save(item);
    return this.getServiceItemDetail(appointmentId, itemId, scopedFacilityId);
  }

  async completeServiceItem(
    appointmentId: string,
    itemId: string,
    scopedFacilityId?: string | null,
    actorId?: string,
    actorIsDoctor = false,
  ) {
    const item = await this.findServiceItemOrFail(appointmentId, itemId, scopedFacilityId);
    if (actorIsDoctor && actorId) await this.assertSpecialistCanAccessItem(itemId, actorId);
    item.completedAt = new Date();
    item.status = AppointmentServiceItemStatus.COMPLETED;
    await this.dataSource.getRepository(AppointmentServiceItem).save(item);
    return this.getServiceItemDetail(appointmentId, itemId, scopedFacilityId);
  }

  async findPatientServiceResults(appointmentId: string, patientId: string) {
    await this.findPatientAppointmentOrFail(appointmentId, patientId);
    return this.buildServiceItemsQuery(appointmentId).getRawMany();
  }

  async getPatientServiceQueue(appointmentId: string, itemId: string, patientId: string) {
    await this.findPatientAppointmentOrFail(appointmentId, patientId);
    return this.getServiceQueue(appointmentId, itemId);
  }

  private async getServiceItemDetail(
    appointmentId: string,
    itemId: string,
    scopedFacilityId?: string | null,
  ) {
    await this.findAppointmentOrFail(appointmentId, scopedFacilityId);
    const item = await this.buildServiceItemsQuery(appointmentId)
      .andWhere('item.id = :itemId', { itemId })
      .getRawOne();
    if (!item) throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
    return item;
  }

  private async getServiceQueue(appointmentId: string, itemId: string) {
    const item = await this.dataSource
      .getRepository(AppointmentServiceItem)
      .createQueryBuilder('item')
      .innerJoin('item.appointment', 'appointment')
      .leftJoin('item.facilityService', 'facilityService')
      .leftJoin('item.service', 'service')
      .where('item.id = :itemId', { itemId })
      .andWhere('item.appointmentId = :appointmentId', { appointmentId })
      .select('item.id', 'id')
      .addSelect('item.serviceId', 'serviceId')
      .addSelect('item.roomId', 'roomId')
      .addSelect('appointment.facilityId', 'facilityId')
      .addSelect('DATE(appointment.scheduledStart)', 'appointmentDate')
      .addSelect(
        'COALESCE(facilityService.durationMinutes, service.defaultDurationMinutes)',
        'durationMinutes',
      )
      .addSelect('item.checkedInAt', 'checkedInAt')
      .getRawOne<{
        id: string;
        serviceId: string;
        roomId: string;
        facilityId: string;
        appointmentDate: string;
        durationMinutes: string | number;
        checkedInAt: Date | null;
      }>();
    if (!item) throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);

    const waitingStatuses = [
      AppointmentServiceItemStatus.WAITING,
      AppointmentServiceItemStatus.CALLED,
    ];
    const queueQb = this.dataSource
      .getRepository(AppointmentServiceItem)
      .createQueryBuilder('queueItem')
      .innerJoin('queueItem.appointment', 'queueAppointment')
      .where('queueAppointment.facilityId = :facilityId', { facilityId: item.facilityId })
      .andWhere('queueItem.serviceId = :serviceId', { serviceId: item.serviceId })
      .andWhere('queueItem.roomId = :roomId', { roomId: item.roomId })
      .andWhere('DATE(queueAppointment.scheduledStart) = :appointmentDate', {
        appointmentDate: item.appointmentDate,
      });

    const [waitingTotal, currentServing] = await Promise.all([
      queueQb
        .clone()
        .andWhere('queueItem.status IN (:...waitingStatuses)', { waitingStatuses })
        .getCount(),
      queueQb
        .clone()
        .andWhere('queueItem.status = :status', {
          status: AppointmentServiceItemStatus.IN_PROGRESS,
        })
        .getCount(),
    ]);

    const ahead = item.checkedInAt
      ? await queueQb
          .clone()
          .andWhere('queueItem.status IN (:...waitingStatuses)', { waitingStatuses })
          .andWhere('queueItem.checkedInAt < :checkedInAt', { checkedInAt: item.checkedInAt })
          .getCount()
      : waitingTotal;
    const position = item.checkedInAt ? ahead + 1 : null;
    const durationMinutes = Number(item.durationMinutes ?? 0);
    const estimatedWaitMinutes = durationMinutes * (currentServing + Math.max(ahead, 0));

    return {
      appointmentServiceItemId: item.id,
      serviceId: item.serviceId,
      roomId: item.roomId,
      position,
      waitingTotal,
      currentServing,
      durationMinutes,
      estimatedWaitMinutes,
    };
  }

  async checkIn(id: string, dto: CheckInAppointmentDto, scopedFacilityId?: string | null) {
    return this.dataSource.transaction(async (manager) => {
      const appointment = await manager.getRepository(Appointment).findOne({ where: { id } });
      if (!appointment) throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
      this.assertAppointmentFacility(appointment, scopedFacilityId);
      if (
        [
          AppointmentStatus.CANCELLED,
          AppointmentStatus.NO_SHOW,
          AppointmentStatus.COMPLETED,
        ].includes(appointment.status)
      ) {
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
      if (!profile)
        throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.PROFILE_NOT_BELONG_TO_PATIENT);

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
      if (isPastDateTime(dto.date, startTime)) {
        throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.PAST_SLOT_INVALID);
      }
      const shift = await this.findShiftForDoctor(
        manager,
        dto.doctorId,
        appointment.facilityId,
        dto.date,
        startTime,
        endTime,
        dto.shiftId,
      );
      await this.ensureSlotFree(
        manager,
        appointment.facilityId,
        shift.staffId,
        dto.date,
        startTime,
        endTime,
        id,
      );

      appointment.doctorId = shift.staffId;
      appointment.shiftId = shift.id;
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
    return this.updateStatus(
      id,
      AppointmentStatus.CANCELLED,
      dto.reason,
      undefined,
      scopedFacilityId,
    );
  }

  async noShow(id: string, dto: CancelAppointmentDto, scopedFacilityId?: string | null) {
    return this.updateStatus(
      id,
      AppointmentStatus.NO_SHOW,
      dto.reason,
      { noShowHandledAt: new Date() },
      scopedFacilityId,
    );
  }

  async complete(id: string, scopedFacilityId?: string | null) {
    return this.updateStatus(
      id,
      AppointmentStatus.COMPLETED,
      undefined,
      undefined,
      scopedFacilityId,
    );
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
    await this.syncAppointmentScheduleStatus(
      this.dataSource.manager,
      appointment.id,
      status,
      reason,
    );
    return this.findManagementById(id, scopedFacilityId);
  }

  private assertAppointmentFacility(appointment: Appointment, scopedFacilityId?: string | null) {
    if (scopedFacilityId && String(appointment.facilityId) !== String(scopedFacilityId)) {
      throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND_IN_FACILITY);
    }
  }

  private async findAppointmentOrFail(
    id: string,
    scopedFacilityId?: string | null,
    manager: EntityManager = this.dataSource.manager,
    doctorId?: string,
    requireCheckedIn = false,
  ) {
    const appointment = await manager.getRepository(Appointment).findOne({ where: { id } });
    if (!appointment) throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
    this.assertAppointmentFacility(appointment, scopedFacilityId);
    if (doctorId && String(appointment.doctorId) !== String(doctorId)) {
      throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
    }
    if (requireCheckedIn && !appointment.checkedInAt) {
      throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
    }
    return appointment;
  }

  private async getDoctorSpecialty(staffId: string) {
    const doctor = await this.dataSource
      .createQueryBuilder()
      .select('doctor.specialty', 'specialty')
      .from('doctors', 'doctor')
      .where('doctor.staff_id = :staffId', { staffId })
      .andWhere('doctor.status = :status', { status: ActiveStatus.ACTIVE })
      .getRawOne<{ specialty?: string | null }>();

    return doctor?.specialty?.trim() || null;
  }

  private async assertObstetricsDoctor(staffId: string) {
    const specialty = await this.getDoctorSpecialty(staffId);
    if (!isObstetricsSpecialty(specialty)) {
      throw new ForbiddenException(
        'Chỉ bác sĩ phụ sản/sản phụ khoa được xem lịch đặt khám và tạo chỉ định dịch vụ.',
      );
    }
  }

  private async assertSpecialistCanAccessItem(itemId: string, staffId: string) {
    const item = await this.dataSource
      .createQueryBuilder()
      .select('item.doctor_id', 'doctorStaffId')
      .from('appointment_service_items', 'item')
      .where('item.id = :itemId', { itemId })
      .getRawOne<{ doctorStaffId?: string | null }>();

    if (!item?.doctorStaffId || String(item.doctorStaffId) !== String(staffId)) {
      throw new ForbiddenException('Bạn chỉ được thao tác chỉ định được giao cho mình.');
    }
  }

  private async findPatientAppointmentOrFail(id: string, patientId: string) {
    const appointment = await this.dataSource.getRepository(Appointment).findOne({
      where: { id, patientId },
    });
    if (!appointment) throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
    return appointment;
  }

  private async findServiceItemOrFail(
    appointmentId: string,
    itemId: string,
    scopedFacilityId?: string | null,
  ) {
    await this.findAppointmentOrFail(appointmentId, scopedFacilityId);
    const item = await this.dataSource.getRepository(AppointmentServiceItem).findOne({
      where: { id: itemId, appointmentId },
    });
    if (!item) throw new NotFoundException(RESPONSE_MESSAGES.APPOINTMENTS.NOT_FOUND);
    return item;
  }

  private async ensureServiceRoomAvailable(
    manager: EntityManager,
    roomId: string,
    facilityId: string,
  ) {
    const room = await manager.getRepository(Room).findOne({
      where: {
        id: roomId,
        facilityId,
        status: ActiveStatus.ACTIVE,
      },
    });
    if (!room || room.deletedAt) {
      throw new BadRequestException('Phòng thực hiện dịch vụ không khả dụng tại cơ sở này.');
    }
    return room;
  }

  private async ensureDoctorShiftForServiceRoom(
    manager: EntityManager,
    staffId: string,
    facilityId: string,
    roomId: string,
    date: string,
  ) {
    const shift = await manager.getRepository(DoctorShift).findOne({
      where: {
        staffId,
        facilityId,
        roomId,
        shiftDate: date,
        status: DoctorShiftStatus.AVAILABLE,
      },
    });
    if (!shift) {
      throw new BadRequestException(
        'Bác sĩ chuyên khoa không có ca trực tại phòng này trong ngày lịch hẹn.',
      );
    }
    return shift;
  }

  private assertServiceItemMutable(item: AppointmentServiceItem) {
    if (
      [
        AppointmentServiceItemStatus.CANCELLED,
        AppointmentServiceItemStatus.COMPLETED,
        AppointmentServiceItemStatus.RESULT_UPLOADED,
      ].includes(item.status)
    ) {
      throw new BadRequestException('Chỉ định dịch vụ này không thể cập nhật trạng thái hiện tại.');
    }
  }

  private async updateAppointmentInProgress(appointmentId: string) {
    const appointment = await this.dataSource.getRepository(Appointment).findOne({
      where: { id: appointmentId },
    });
    if (!appointment) return;
    if (
      [
        AppointmentStatus.BOOKED,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CHECKED_IN,
      ].includes(appointment.status)
    ) {
      appointment.status = AppointmentStatus.IN_PROGRESS;
      await this.dataSource.getRepository(Appointment).save(appointment);
    }
  }

  private buildServiceItemsQuery(appointmentId?: string) {
    const query = this.dataSource
      .createQueryBuilder()
      .select('item.id', 'id')
      .addSelect('item.appointment_id', 'appointmentId')
      .addSelect('item.service_id', 'serviceId')
      .addSelect('item.facility_service_id', 'facilityServiceId')
      .addSelect('item.doctor_id', 'doctorStaffId')
      .addSelect('item.room_id', 'roomId')
      .addSelect('item.sequence', 'sequence')
      .addSelect('item.status', 'status')
      .addSelect('item.checked_in_at', 'checkedInAt')
      .addSelect('item.called_at', 'calledAt')
      .addSelect('item.started_at', 'startedAt')
      .addSelect('item.result_expected_at', 'resultExpectedAt')
      .addSelect('item.result_uploaded_at', 'resultUploadedAt')
      .addSelect('item.completed_at', 'completedAt')
      .addSelect('item.note', 'note')
      .addSelect('appointment.facility_id', 'facilityId')
      .addSelect('appointment.patient_id', 'patientId')
      .addSelect('appointment.scheduled_start', 'scheduledStart')
      .addSelect('appointment.scheduled_end', 'scheduledEnd')
      .addSelect('appointment.status', 'appointmentStatus')
      .addSelect('patient.name', 'patientName')
      .addSelect('patient.phone', 'patientPhone')
      .addSelect('facility.name', 'facilityName')
      .addSelect('service.name', 'serviceName')
      .addSelect(
        'COALESCE(facilityService.duration_minutes, service.default_duration_minutes)',
        'durationMinutes',
      )
      .addSelect('room.name', 'roomName')
      .addSelect('doctor.id', 'doctorId')
      .addSelect('doctor.title', 'doctorTitle')
      .addSelect('doctor.specialty', 'doctorSpecialty')
      .addSelect('staff.name', 'doctorName')
      .addSelect('medicalRecord.id', 'medicalRecordId')
      .addSelect('medicalRecord.diagnosis', 'diagnosis')
      .addSelect('medicalRecord.conclusion', 'conclusion')
      .addSelect('medicalRecord.recommendation', 'recommendation')
      .addSelect('medicalRecord.next_appointment_suggested_at', 'nextAppointmentSuggestedAt')
      .from('appointment_service_items', 'item')
      .leftJoin('appointments', 'appointment', 'appointment.id = item.appointment_id')
      .leftJoin('users', 'patient', 'patient.id = appointment.patient_id')
      .leftJoin('facilities', 'facility', 'facility.id = appointment.facility_id')
      .leftJoin('services', 'service', 'service.id = item.service_id')
      .leftJoin(
        'facility_services',
        'facilityService',
        'facilityService.id = item.facility_service_id',
      )
      .leftJoin('rooms', 'room', 'room.id = item.room_id')
      .leftJoin('staffs', 'staff', 'staff.id = item.doctor_id')
      .leftJoin('doctors', 'doctor', 'doctor.staff_id = staff.id')
      .leftJoin(
        'medical_records',
        'medicalRecord',
        'medicalRecord.appointment_service_item_id = item.id',
      )
      .orderBy('item.sequence', 'ASC')
      .addOrderBy('item.id', 'ASC');

    if (appointmentId) {
      query.where('item.appointment_id = :appointmentId', { appointmentId });
    } else {
      query.where('1 = 1').orderBy('appointment.scheduled_start', 'DESC');
    }

    return query;
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
    shiftId?: string,
  ) {
    const query = manager
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
      .andWhere('shift.end_time >= :endTime', { endTime });
    if (shiftId) {
      query.andWhere('shift.id = :shiftId', { shiftId });
    }
    const shift = await query.getRawOne<{ id: string; staffId: string; roomId: string | null }>();
    if (!shift)
      throw new BadRequestException(RESPONSE_MESSAGES.APPOINTMENTS.DOCTOR_SHIFT_NOT_AVAILABLE);
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
    if (excludeAppointmentId)
      qb.andWhere('appointment.id != :excludeAppointmentId', { excludeAppointmentId });
    const activeAppointments = await qb.getMany();
    if (
      activeAppointments.some((appointment) =>
        overlaps(startTime, endTime, appointment.scheduledStart, appointment.scheduledEnd),
      )
    ) {
      throw new ConflictException(RESPONSE_MESSAGES.APPOINTMENTS.SLOT_CONFLICT);
    }
  }

  private async syncAppointmentSchedule(manager: EntityManager, appointmentId: string) {
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
        schedule.status = 'upcoming',
        schedule.location = COALESCE(facility.name, facility.address, schedule.location),
        schedule.doctor = NULLIF(TRIM(CONCAT_WS(' ', doctor.title, staff.name)), ''),
        schedule.note = NULL,
        schedule.updated_at = CURRENT_TIMESTAMP
      WHERE schedule.appointment_id = ?
        AND schedule.source = 'appointment'
      `,
      [appointmentId],
    );
  }

  private async syncAppointmentScheduleStatus(
    manager: EntityManager,
    appointmentId: string,
    status: AppointmentStatus,
    reason?: string,
  ) {
    const scheduleStatus =
      status === AppointmentStatus.COMPLETED
        ? 'done'
        : status === AppointmentStatus.NO_SHOW
          ? 'missed'
          : status === AppointmentStatus.CANCELLED
            ? 'cancelled'
            : null;

    if (!scheduleStatus) return;

    await manager.query(
      `UPDATE user_schedules
       SET status = ?,
           note = COALESCE(?, note),
           updated_at = CURRENT_TIMESTAMP
       WHERE appointment_id = ? AND source = 'appointment'`,
      [scheduleStatus, reason?.trim() || null, appointmentId],
    );
  }
}
