import { DeepPartial } from 'typeorm';
import { Facility } from '../entities/facilities.entity';
import { FacilityStatus } from '../../../common/constants/status.enum';
import { SearchFacilityDto } from '../dto/requests/search-facility.dto';
import {PaginationResult} from '../../../common/helpers/pagination';
export const FACILITIES_REPOSITORY = Symbol('FACILITIES_REPOSITORY');

// truy cap db 
export interface IFacilitiesRepository {
  create(data: DeepPartial<Facility>): Facility;
  save(facility: Facility): Promise<Facility>;
  findAll(filters?: SearchFacilityDto): Promise<Facility[]>;
  findAllPaginated?(filters?: SearchFacilityDto): Promise<PaginationResult<Facility>>;
  findById(id: string): Promise<Facility | null>;
  findByCode(code: string): Promise<Facility | null>;
  findByName(name: string): Promise<Facility | null>;
  remove(facility: Facility): Promise<void>;
  updateStatus(id: string, status: FacilityStatus): Promise<Facility>;
}
