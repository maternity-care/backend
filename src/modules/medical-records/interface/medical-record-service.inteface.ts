import { PaginationResult } from '../../../common/helpers/pagination';
import { CreateMedicalRecordDto } from '../dto/requests/create-medical-record.dto';
import { SearchMedicalRecordDto } from '../dto/requests/search-medical-record.dto';
import { UpdateMedicalRecordDto } from '../dto/requests/update-medical-record.dto';
import { MedicalRecord } from '../entities/medical-record.entity';

export const MEDICAL_RECORD_SERVICE = Symbol('MEDICAL_RECORD_SERVICE');

export interface IMedicalRecordService {
  create(dto: CreateMedicalRecordDto): Promise<MedicalRecord>;
  findAll(filters?: SearchMedicalRecordDto): Promise<MedicalRecord[]>;
  findAllPaginated(filters?: SearchMedicalRecordDto): Promise<PaginationResult<MedicalRecord>>;
  findById(id: string): Promise<MedicalRecord>;
  update(id: string, dto: UpdateMedicalRecordDto): Promise<MedicalRecord>;
  remove(id: string): Promise<void>;
}
