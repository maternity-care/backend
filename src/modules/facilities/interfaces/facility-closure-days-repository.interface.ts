import { DeepPartial } from 'typeorm';
import { FacilityClosureDay } from '../entities/facility-closure-day.entity';
import { SearchFacilityClosureDayDto } from '../dto/requests/facility-closure-day.dto';

export const FACILITY_CLOSURE_DAYS_REPOSITORY = Symbol('FACILITY_CLOSURE_DAYS_REPOSITORY');

export interface IFacilityClosureDaysRepository {
  createClosureDay(data: DeepPartial<FacilityClosureDay>): FacilityClosureDay;
  
  saveClosureDay(closureDay: FacilityClosureDay): Promise<FacilityClosureDay>;
  
  removeClosureDay(closureDay: FacilityClosureDay): Promise<void>;
  
  findClosureDaysByFacilityId(
    facilityId: string, 
    filters?: SearchFacilityClosureDayDto
  ): Promise<Array<{ id: string; facilityId: string; closureDate: string; reason: string | null; status: string }>>;
  
  findClosureDayById(facilityId: string, closureDayId: string): Promise<FacilityClosureDay | null>;
  
  findClosureDayByDate(facilityId: string, closureDate: string): Promise<FacilityClosureDay | null>;
}
