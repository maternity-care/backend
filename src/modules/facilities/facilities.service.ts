import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFacilityDto } from './dto/requests/create-facility.dto';
import { SearchFacilityDto } from './dto/requests/search-facility.dto';
import { UpdateFacilityDto } from './dto/requests/update-facility.dto';
import { Facility } from './entities/facilities.entity';
import { FACILITIES_REPOSITORY, IFacilitiesRepository } from './interfaces/facility-repository.interface';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';

@Injectable()
export class FacilitiesService {
  constructor(
    @Inject(FACILITIES_REPOSITORY)
    private readonly facilitiesRepository: IFacilitiesRepository,
  ) {}

  async create(dto: CreateFacilityDto): Promise<Facility> {
    const existing = await this.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(RESPONSE_MESSAGES.FACILITY_ALREADY_EXISTS);
    }

    const facility = this.facilitiesRepository.create(dto);
    return this.facilitiesRepository.save(facility);
  }

  async findAll(query?: SearchFacilityDto): Promise<Facility[]> {
    const facilities = await this.facilitiesRepository.findAll(query);
    if (!facilities || facilities.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITY_NOT_FOUND);
    }
    return facilities;
  }

  async findAllPaginated(query?: SearchFacilityDto) {
    const result = await this.facilitiesRepository.findAllPaginated!(query);
    if (!result || !result.items || result.items.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITY_NOT_FOUND);
    }
    return result;
  }

  async findById(id: string): Promise<Facility> {
    const facility = await this.facilitiesRepository.findById(id);
    if (!facility) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITY_NOT_FOUND);
    }

    return facility;
  }

  findByCode(code: string): Promise<Facility | null> {
    return this.facilitiesRepository.findByCode(code);
  }

  async findByName(name: string): Promise<Facility | null> {
    return this.facilitiesRepository.findByName(name);
  }

  async update(id: string, dto: UpdateFacilityDto): Promise<Facility> {
    const facility = await this.findById(id);

    if (dto.code && dto.code !== facility.code) {
      const existing = await this.findByCode(dto.code);
      if (existing) {
        throw new ConflictException(RESPONSE_MESSAGES.FACILITY_ALREADY_EXISTS);
      }
    }

    Object.assign(facility, dto);
    return this.facilitiesRepository.save(facility);
  }

  async remove(id: string, reason?: string, deletedBy?: string | null): Promise<SafeRemoveResult> {
    const facility = await this.findById(id);
    const dependencyCount = await this.facilitiesRepository.countDependencies(facility.id);
    if (dependencyCount === 0) {
      await this.facilitiesRepository.remove(facility);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    await this.facilitiesRepository.softDelete(facility, reason, deletedBy);
    return { action: 'soft_deleted', affectedCount: dependencyCount };
  }

  async deActivateFacility(id: string): Promise<Facility> {
    const facility = await this.facilitiesRepository.deActivateFacility(id);
    return facility;
  }


  
}
