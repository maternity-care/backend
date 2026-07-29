import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMedicalRecordDto } from './dto/requests/create-medical-record.dto';
import { SearchMedicalRecordDto } from './dto/requests/search-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/requests/update-medical-record.dto';
import { MedicalRecord } from './entities/medical-record.entity';
import {
  IMedicalRecordRepository,
  MEDICAL_RECORD_REPOSITORY,
} from './interface/medical-record-repository.interface';
import { IMedicalRecordService } from './interface/medical-record-service.inteface';
import { MEDICAL_RECORD_MESSAGES } from './medical-record.constant';

@Injectable()
export class MedicalRecordsService implements IMedicalRecordService {
  constructor(
    @Inject(MEDICAL_RECORD_REPOSITORY)
    private readonly repository: IMedicalRecordRepository,
  ) {}

  async create(dto: CreateMedicalRecordDto): Promise<MedicalRecord> {
    await this.validateAppointmentData(dto.appointmentId, dto.pregnancyProfileId, dto.doctorId);

    if (await this.repository.findByAppointmentId(dto.appointmentId)) {
      throw new ConflictException(MEDICAL_RECORD_MESSAGES.APPOINTMENT_ALREADY_HAS_RECORD);
    }

    const record = this.repository.create({
      ...dto,
      diagnosis: dto?.diagnosis ?? null,
      recommendation: dto?.recommendation ?? null,
      nextAppointmentSuggestedAt: dto.nextAppointmentSuggestedAt
        ? new Date(dto.nextAppointmentSuggestedAt)
        : null,
    });
    const saved = await this.repository.save(record);
    const medicalFiles = dto?.files
      ? dto.files?.map((file) => ({ ...file, medicalRecordId: saved.id }))
      : [];
    await this.repository.createMedicalFiles(medicalFiles);
    // TODO: đặt lịch và thông báo cho bệnh nhân
    if (dto?.nextAppointmentSuggestedAt) {
      // TODO: tạo lịch hẹn
    }
    return this.findById(saved.id);
  }

  findAll(filters?: SearchMedicalRecordDto): Promise<MedicalRecord[]> {
    this.validateDateRange(filters);
    return this.repository.findAll(filters);
  }

  findAllPaginated(filters?: SearchMedicalRecordDto) {
    this.validateDateRange(filters);
    return this.repository.findAllPaginated(filters);
  }

  async findById(id: string): Promise<MedicalRecord> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new NotFoundException(MEDICAL_RECORD_MESSAGES.NOT_FOUND);
    }
    return record;
  }

  async update(id: string, dto: UpdateMedicalRecordDto): Promise<MedicalRecord> {
    const record = await this.findById(id);
    const appointmentId = dto.appointmentId ?? record.appointmentId;
    const pregnancyProfileId = dto.pregnancyProfileId ?? record.pregnancyProfileId;
    const doctorId = dto.doctorId ?? record.doctorId;

    await this.validateAppointmentData(appointmentId, pregnancyProfileId, doctorId);

    if (appointmentId !== record.appointmentId) {
      const existing = await this.repository.findByAppointmentId(appointmentId);
      if (existing && existing.id !== record.id) {
        throw new ConflictException(MEDICAL_RECORD_MESSAGES.APPOINTMENT_ALREADY_HAS_RECORD);
      }
    }

    Object.assign(record, {
      ...dto,
      ...(dto.nextAppointmentSuggestedAt === undefined
        ? {}
        : {
            nextAppointmentSuggestedAt: dto.nextAppointmentSuggestedAt
              ? new Date(dto.nextAppointmentSuggestedAt)
              : null,
          }),
    });
    await this.repository.save(record);
    return this.findById(record.id);
  }

  async remove(id: string): Promise<void> {
    const record = await this.findById(id);
    if ((await this.repository.countFiles(id)) > 0) {
      throw new ConflictException(MEDICAL_RECORD_MESSAGES.HAS_FILES);
    }
    await this.repository.remove(record);
  }

  private async validateAppointmentData(
    appointmentId: string,
    pregnancyProfileId: string,
    doctorId: string,
  ): Promise<void> {
    const appointment = await this.repository.findAppointmentById(appointmentId);
    if (!appointment) {
      throw new NotFoundException(MEDICAL_RECORD_MESSAGES.APPOINTMENT_NOT_FOUND);
    }
    if (
      appointment.pregnancyProfileId !== pregnancyProfileId ||
      appointment.doctorId !== doctorId
    ) {
      throw new BadRequestException(MEDICAL_RECORD_MESSAGES.APPOINTMENT_DATA_MISMATCH);
    }
  }

  private validateDateRange(filters?: SearchMedicalRecordDto): void {
    if (
      filters?.createdFrom &&
      filters.createdTo &&
      new Date(filters.createdFrom) > new Date(filters.createdTo)
    ) {
      throw new BadRequestException(MEDICAL_RECORD_MESSAGES.DATE_RANGE_INVALID);
    }
  }
}
