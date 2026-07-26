import { DeepPartial } from 'typeorm';
import { PaginationResult } from '../../../common/helpers/pagination';
import { Appointment } from '../../../database/entities/appointment.entity';
import { SearchMedicalRecordDto } from '../dto/requests/search-medical-record.dto';
import { MedicalRecord } from '../entities/medical-record.entity';

export const MEDICAL_RECORD_REPOSITORY = Symbol('MEDICAL_RECORD_REPOSITORY');

export interface IMedicalRecordRepository {
  create(data: DeepPartial<MedicalRecord>): MedicalRecord;
  save(record: MedicalRecord): Promise<MedicalRecord>;
  remove(record: MedicalRecord): Promise<void>;
  findById(id: string): Promise<MedicalRecord | null>;
  findByAppointmentId(appointmentId: string): Promise<MedicalRecord | null>;
  findAppointmentById(id: string): Promise<Appointment | null>;
  findAll(filters?: SearchMedicalRecordDto): Promise<MedicalRecord[]>;
  findAllPaginated(filters?: SearchMedicalRecordDto): Promise<PaginationResult<MedicalRecord>>;
  countFiles(recordId: string): Promise<number>;
}
