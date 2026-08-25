import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { IRedisCacheService, REDIS_CACHE_SERVICE } from '../../common/cache/redis-cache.interface';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { JobsService } from '../jobs/jobs.service';
import { CreateMedicalRecordDto } from './dto/requests/create-medical-record.dto';
import { RegisterPendingMedicalFileDto } from './dto/requests/pending-medical-file.dto';
import { SearchMedicalRecordDto } from './dto/requests/search-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/requests/update-medical-record.dto';
import { MedicalRecord } from './entities/medical-record.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  IMedicalRecordRepository,
  MEDICAL_RECORD_REPOSITORY,
} from './interface/medical-record-repository.interface';
import { IMedicalRecordService } from './interface/medical-record-service.inteface';
import { MEDICAL_RECORD_MESSAGES } from './medical-record.constant';

@Injectable()
export class MedicalRecordsService implements IMedicalRecordService {
  private readonly logger = new Logger(MedicalRecordsService.name);
  private readonly pendingFileTtlSeconds = 24 * 60 * 60;
  private readonly vietnamTimeZone = 'Asia/Ho_Chi_Minh';

  constructor(
    @Inject(MEDICAL_RECORD_REPOSITORY)
    private readonly repository: IMedicalRecordRepository,
    @Inject(REDIS_CACHE_SERVICE)
    private readonly cacheService: IRedisCacheService,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly jobsService: JobsService,
  ) {}

  async create(dto: CreateMedicalRecordDto): Promise<MedicalRecord> {
    const medicalRecord = dto.appointmentServiceItemId
      ? null
      : await this.repository.findByAppointmentId(dto.appointmentId);
    if (medicalRecord) {
      // đã có, cập nhật
      medicalRecord.diagnosis = dto?.diagnosis ?? medicalRecord.diagnosis;
      medicalRecord.conclusion = dto?.conclusion ?? medicalRecord.conclusion;
      medicalRecord.recommendation = dto?.recommendation ?? medicalRecord.recommendation;
      medicalRecord.nextAppointmentSuggestedAt = dto.nextAppointmentSuggestedAt
        ? new Date(dto.nextAppointmentSuggestedAt)
        : medicalRecord.nextAppointmentSuggestedAt;

      await this.repository.save(medicalRecord);

      if (dto?.files?.length) {
        await this.repository.createMedicalFiles(
          dto.files?.map((file) => ({ ...file, medicalRecordId: medicalRecord.id })),
        );
        await this.clearPendingFiles(dto.appointmentId);
        if (dto.appointmentServiceItemId) {
          await this.markServiceItemResultUploaded(dto.appointmentServiceItemId);
        }
      }

      return this.findById(medicalRecord.id);
    }

    const appointment = await this.validateAppointmentData(
      dto.appointmentId,
      dto.pregnancyProfileId,
      dto.doctorId,
      dto.appointmentServiceItemId,
    );

    const record = this.repository.create({
      ...dto,
      diagnosis: dto?.diagnosis ?? null,
      conclusion: dto?.conclusion ?? null,
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
    if (medicalFiles.length > 0) {
      await this.clearPendingFiles(dto.appointmentId);
    }
    if (dto.appointmentServiceItemId) {
      await this.markServiceItemResultUploaded(dto.appointmentServiceItemId);
    }
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
    const appointmentServiceItemId =
      dto.appointmentServiceItemId ?? record.appointmentServiceItemId;
    const pregnancyProfileId = dto.pregnancyProfileId ?? record.pregnancyProfileId;
    const doctorId = dto.doctorId ?? record.doctorId;

    await this.validateAppointmentData(
      appointmentId,
      pregnancyProfileId,
      doctorId,
      appointmentServiceItemId,
    );

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

  async publish(id: string, user: AuthenticatedUser): Promise<MedicalRecord> {
    const record = await this.findById(id);

    if (record.doctorId !== user.id) {
      throw new ForbiddenException(MEDICAL_RECORD_MESSAGES.PUBLISH_ONLY_OWNER);
    }

    if (!this.isAppointmentToday(record.appointment?.scheduledStart)) {
      throw new BadRequestException(MEDICAL_RECORD_MESSAGES.PUBLISH_ONLY_TODAY);
    }

    if (!record.isPublic) {
      record.isPublic = true;
      record.publishedAt = new Date();
      record.publishedBy = user.id;
      await this.repository.save(record);
    }

    const appointment = record.appointment ?? (await this.repository.findAppointmentById(record.appointmentId));
    if (appointment?.patientId) {
      await this.enqueueExamResultNotification(
        appointment.patientId,
        record.appointmentId,
        record.appointmentServiceItemId,
        record.id,
      );
    }

    return this.findById(record.id);
  }

  async remove(id: string): Promise<void> {
    const record = await this.findById(id);
    if ((await this.repository.countFiles(id)) > 0) {
      throw new ConflictException(MEDICAL_RECORD_MESSAGES.HAS_FILES);
    }
    await this.repository.remove(record);
  }

  async registerPendingFile(dto: RegisterPendingMedicalFileDto) {
    const appointment = await this.repository.findAppointmentById(dto.appointmentId);
    if (!appointment) {
      throw new NotFoundException(MEDICAL_RECORD_MESSAGES.APPOINTMENT_NOT_FOUND);
    }

    const file = {
      id: this.createPendingFileId(dto.appointmentId, dto.fileUrl),
      appointmentId: dto.appointmentId,
      pregnancyProfileId: appointment.pregnancyProfileId,
      doctorId: appointment.doctorId,
      fileType:
        dto.fileType || (dto.mimeType.startsWith('image/') ? 'clinical_image' : 'clinical_report'),
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      mimeType: dto.mimeType,
      sourcePath: dto.sourcePath ?? null,
      createdAt: new Date().toISOString(),
    };

    const currentFiles = await this.listPendingFiles(dto.appointmentId);
    const nextFiles = [
      file,
      ...currentFiles.filter(
        (item) => item.fileUrl !== file.fileUrl && item.fileName !== file.fileName,
      ),
    ].slice(0, 100);

    await this.cacheService.set(
      this.pendingFilesKey(dto.appointmentId),
      nextFiles,
      this.pendingFileTtlSeconds,
    );
    this.realtimeEvents.emitAppointmentEvent(
      'medical-record:file.pending',
      dto.appointmentId,
      file,
    );

    return file;
  }

  async listPendingFiles(appointmentId: string) {
    return (
      (await this.cacheService.get<Array<Record<string, unknown>>>(
        this.pendingFilesKey(appointmentId),
      )) ?? []
    );
  }

  async clearPendingFiles(appointmentId: string): Promise<void> {
    await this.cacheService.del(this.pendingFilesKey(appointmentId));
  }

  private async validateAppointmentData(
    appointmentId: string,
    pregnancyProfileId: string,
    doctorId: string,
    appointmentServiceItemId?: string | null,
  ) {
    const appointment = await this.repository.findAppointmentById(appointmentId);
    if (!appointment) {
      throw new NotFoundException(MEDICAL_RECORD_MESSAGES.APPOINTMENT_NOT_FOUND);
    }
    if (appointment.pregnancyProfileId !== pregnancyProfileId) {
      throw new BadRequestException(MEDICAL_RECORD_MESSAGES.APPOINTMENT_DATA_MISMATCH);
    }
    if (appointmentServiceItemId) {
      const serviceItem = await this.repository.findAppointmentServiceItemById(
        appointmentServiceItemId,
        appointmentId,
      );
      if (!serviceItem) {
        throw new BadRequestException(MEDICAL_RECORD_MESSAGES.APPOINTMENT_DATA_MISMATCH);
      }
      if (serviceItem.doctorId !== doctorId) {
        throw new BadRequestException(MEDICAL_RECORD_MESSAGES.APPOINTMENT_DATA_MISMATCH);
      }
      return appointment;
    }
    if (appointment.doctorId !== doctorId) {
      throw new BadRequestException(MEDICAL_RECORD_MESSAGES.APPOINTMENT_DATA_MISMATCH);
    }
    return appointment;
  }

  private async markServiceItemResultUploaded(appointmentServiceItemId: string) {
    await this.repository.markAppointmentServiceItemResultUploaded(appointmentServiceItemId);
  }

  private async enqueueExamResultNotification(
    patientId: string,
    appointmentId: string,
    appointmentServiceItemId?: string | null,
    medicalRecordId?: string | null,
  ) {
    try {
      await this.jobsService.enqueueExamResultNotification({
        patientId,
        appointmentId,
        appointmentServiceItemId,
        medicalRecordId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown queue error';
      this.logger.warn(
        `Không enqueue được job thông báo kết quả cho lịch ${appointmentId}: ${message}`,
      );
    }
  }

  private isAppointmentToday(value?: Date | string | null): boolean {
    if (!value) return false;
    return this.formatDateKey(value) === this.formatDateKey(new Date());
  }

  private formatDateKey(value: Date | string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.vietnamTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
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

  private pendingFilesKey(appointmentId: string): string {
    return `medical-records:pending-files:${appointmentId}`;
  }

  private createPendingFileId(appointmentId: string, fileUrl: string): string {
    return `${appointmentId}:${Buffer.from(fileUrl).toString('base64url').slice(0, 32)}`;
  }
}
