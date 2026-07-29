import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UserSchedule } from './entities/user-schedule.entity';
import { CreateUserScheduleDto } from './dto/create-user-schedule.dto';

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function toScheduleResponse(schedule: UserSchedule) {
  return {
    id: String(schedule.id),
    title: schedule.title,
    type: schedule.type,
    date: schedule.scheduleDate,
    time: normalizeTime(schedule.scheduleTime).slice(0, 5),
    location: schedule.location ?? undefined,
    doctor: schedule.doctor ?? undefined,
    status: schedule.status,
    note: schedule.note ?? undefined,
    createdByUser: schedule.source === 'manual',
    source: schedule.source,
    appointmentId: schedule.appointmentId,
  };
}

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(UserSchedule)
    private readonly schedulesRepository: Repository<UserSchedule>,
  ) {}

  async findMine(userId: string) {
    const schedules = await this.schedulesRepository.find({
      where: { userId },
      order: {
        scheduleDate: 'ASC',
        scheduleTime: 'ASC',
      },
    });

    return schedules.map(toScheduleResponse);
  }

  async createMine(userId: string, dto: CreateUserScheduleDto) {
    const schedule = this.schedulesRepository.create({
      userId,
      title: dto.title.trim(),
      type: dto.type,
      scheduleDate: dto.date,
      scheduleTime: normalizeTime(dto.time),
      status: 'upcoming',
      location: dto.location?.trim() || null,
      note: dto.note?.trim() || null,
      doctor: null,
      source: 'manual',
      appointmentId: null,
    });

    return toScheduleResponse(await this.schedulesRepository.save(schedule));
  }

  async removeMine(userId: string, id: string) {
    const schedule = await this.schedulesRepository.findOne({
      where: {
        id,
        userId,
        source: 'manual',
      },
    });

    if (!schedule) {
      throw new NotFoundException('Không tìm thấy lịch cá nhân để xóa.');
    }

    await this.schedulesRepository.remove(schedule);
    return { id };
  }

  async createForAppointment(
    manager: EntityManager,
    input: {
      userId: string;
      appointmentId: string;
      title: string;
      date: string;
      time: string;
      location?: string | null;
      doctor?: string | null;
      note?: string | null;
      type?: string;
    },
  ) {
    const repository = manager.getRepository(UserSchedule);
    const schedule = repository.create({
      userId: input.userId,
      title: input.title,
      type: input.type ?? 'checkup',
      scheduleDate: input.date,
      scheduleTime: normalizeTime(input.time),
      status: 'upcoming',
      location: input.location ?? null,
      doctor: input.doctor ?? null,
      note: input.note ?? null,
      source: 'appointment',
      appointmentId: input.appointmentId,
    });

    await repository.save(schedule);
  }
}
