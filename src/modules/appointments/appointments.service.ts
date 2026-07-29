import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Appointment } from '../../database/entities/appointment.entity';
import { ActiveStatus, AppointmentStatus, DoctorShiftStatus } from '../../common/constants/status.enum';
import { FacilityService } from '../facility-services/entities/facility-service.entity';
import { DoctorShift } from '../shifts/entities/shift.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

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
  ) {}

  async createForPatient(patientId: string, dto: CreateAppointmentDto) {
    const startTime = normalizeTime(dto.startTime);
    const endTime = normalizeTime(dto.endTime);

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu.');
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
        throw new BadRequestException('Dịch vụ không khả dụng tại cơ sở đã chọn.');
      }

      if (!shift) {
        throw new NotFoundException('Ca trực không tồn tại hoặc không còn khả dụng.');
      }

      if (!shift.roomId) {
        throw new BadRequestException('Ca trực chưa có phòng khám để đặt lịch.');
      }

      if (startTime < normalizeTime(shift.startTime) || endTime > normalizeTime(shift.endTime)) {
        throw new BadRequestException('Slot đã chọn không nằm trong ca trực của bác sĩ.');
      }

      const doctorMatchesShift = await manager
        .createQueryBuilder()
        .select('doctor.id', 'id')
        .from('doctors', 'doctor')
        .where('doctor.id = :doctorId', { doctorId: dto.doctorId })
        .andWhere('doctor.staff_id = :staffId', { staffId: shift.staffId })
        .getRawOne<{ id: string }>();

      if (!doctorMatchesShift) {
        throw new BadRequestException('Bác sĩ đã chọn không khớp với ca trực.');
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
        throw new ConflictException('Slot này vừa có người đặt. Bạn chọn khung giờ khác nhé.');
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

      return manager.getRepository(Appointment).save(appointment);
    });
  }
}
