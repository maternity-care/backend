import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { paginate } from '../../../common/helpers/pagination';
import { searchBuilder } from '../../../common/helpers/search-builder';
import { Appointment } from '../../../database/entities/appointment.entity';
import { MedicalFile } from '../../../database/entities/medical-file.entity';
import { SearchMedicalRecordDto } from '../dto/requests/search-medical-record.dto';
import { MedicalRecord } from '../entities/medical-record.entity';
import { IMedicalRecordRepository } from '../interface/medical-record-repository.interface';

@Injectable()
export class MedicalRecordRepository implements IMedicalRecordRepository {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly repository: Repository<MedicalRecord>,
    @InjectRepository(MedicalFile)
    private readonly medicalFileRepository: Repository<MedicalFile>,
  ) {}

  create(data: DeepPartial<MedicalRecord>): MedicalRecord {
    return this.repository.create(data);
  }

  save(record: MedicalRecord): Promise<MedicalRecord> {
    return this.repository.save(record);
  }

  async remove(record: MedicalRecord): Promise<void> {
    await this.repository.remove(record);
  }

  findById(id: string): Promise<MedicalRecord | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        appointment: true,
        doctor: true,
        pregnancyProfile: true,
        files: true,
      },
      order: { files: { createdAt: 'DESC' } },
    });
  }

  findByAppointmentId(appointmentId: string): Promise<MedicalRecord | null> {
    return this.repository.findOne({ where: { appointmentId } });
  }

  findAppointmentById(id: string): Promise<Appointment | null> {
    return this.repository.manager.findOne(Appointment, { where: { id } });
  }

  findAll(filters?: SearchMedicalRecordDto): Promise<MedicalRecord[]> {
    return this.buildListQuery(filters).getMany();
  }

  findAllPaginated(filters?: SearchMedicalRecordDto) {
    return paginate(this.buildListQuery(filters), {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  countFiles(recordId: string): Promise<number> {
    return this.medicalFileRepository.count({ where: { medicalRecordId: recordId } });
  }

  private buildListQuery(filters?: SearchMedicalRecordDto): SelectQueryBuilder<MedicalRecord> {
    const query = this.repository
      .createQueryBuilder('medicalRecord')
      .leftJoinAndSelect('medicalRecord.appointment', 'appointment')
      .leftJoinAndSelect('medicalRecord.doctor', 'doctor')
      .leftJoinAndSelect('medicalRecord.pregnancyProfile', 'pregnancyProfile')
      .leftJoinAndSelect('medicalRecord.files', 'files')
      .distinct(true);

    searchBuilder(query, filters?.search, {
      columns: ['diagnosis', 'conclusion', 'recommendation'],
      relations: {
        doctor: ['name', 'employeeCode', 'email', 'phone'],
        pregnancyProfile: ['code'],
      },
    });

    if (filters?.appointmentId) {
      query.andWhere('medicalRecord.appointmentId = :appointmentId', {
        appointmentId: filters.appointmentId,
      });
    }
    if (filters?.pregnancyProfileId) {
      query.andWhere('medicalRecord.pregnancyProfileId = :pregnancyProfileId', {
        pregnancyProfileId: filters.pregnancyProfileId,
      });
    }
    if (filters?.doctorId) {
      query.andWhere('medicalRecord.doctorId = :doctorId', { doctorId: filters.doctorId });
    }
    if (filters?.createdFrom) {
      query.andWhere('medicalRecord.createdAt >= :createdFrom', {
        createdFrom: filters.createdFrom,
      });
    }
    if (filters?.createdTo) {
      query.andWhere('medicalRecord.createdAt <= :createdTo', { createdTo: filters.createdTo });
    }

    return query.orderBy('medicalRecord.createdAt', 'DESC');
  }
}
