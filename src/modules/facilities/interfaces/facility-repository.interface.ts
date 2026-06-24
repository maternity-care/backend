import { DeepPartial } from 'typeorm';
import { Facility } from '../entities/facilities.entity';

export const FACILITIES_REPOSITORY = Symbol('FACILITIES_REPOSITORY');

// truy cap db 
export interface IFacilitiesRepository {
  create(data: DeepPartial<Facility>): Facility;
  save(facility: Facility): Promise<Facility>;
  findAll(): Promise<Facility[]>;
  findById(id: string): Promise<Facility | null>;
  findByCode(code: string): Promise<Facility | null>;
  findByName(name: string): Promise<Facility | null>;
  remove(facility: Facility): Promise<void>;
  updateStatus(id: string, status: string): Promise<Facility>;
  
}

