import { DeepPartial } from 'typeorm';
import { Facility } from '../entities/facilities.entity';
import { SearchFacilityDto } from '../dto/requests/search-facility.dto';
export const FACILITIES_REPOSITORY = Symbol('FACILITIES_REPOSITORY');

// truy cap db 
export interface IFacilitiesRepository {
  create(data: DeepPartial<Facility>): Facility;
  save(facility: Facility): Promise<Facility>;
  findAll(filters?: SearchFacilityDto): Promise<Facility[]>;
  findById(id: string): Promise<Facility | null>;
  findByCode(code: string): Promise<Facility | null>;
  findByName(name: string): Promise<Facility | null>;
  remove(facility: Facility): Promise<void>;
  updateStatus(id: string, status: string): Promise<Facility>;
  
}

