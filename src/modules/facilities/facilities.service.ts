import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFacilityDto } from './dto/requests/create-facility.dto';
import { LookupFacilityDto, SearchFacilityDto } from './dto/requests/search-facility.dto';
import { UpdateFacilityDto } from './dto/requests/update-facility.dto';
import { Facility } from './entities/facility.entity';
import {
  FACILITIES_REPOSITORY,
  FacilityLookup,
  FacilityWithDetails,
  IFacilitiesRepository,
} from './interfaces/facility-repository.interface';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';

@Injectable()
export class FacilitiesService {
  constructor(
    @Inject(FACILITIES_REPOSITORY)
    private readonly facilitiesRepository: IFacilitiesRepository,
  ) {}

  async create(dto: CreateFacilityDto): Promise<FacilityWithDetails> {
    await this.ensureOwnerCanManageFacility(dto.ownerId);
    await this.ensureUniqueFacilityIdentity(dto);
    const code = await this.generateFacilityCode(dto.province);

    const facility = this.facilitiesRepository.create({ ...dto, code });
    const saved = await this.facilitiesRepository.save(facility);
    return this.findDetailsById(saved.id);
  }

  async findAll(query?: SearchFacilityDto): Promise<FacilityWithDetails[]> {
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

  async findDetailsById(id: string): Promise<FacilityWithDetails> {
    const facility = await this.facilitiesRepository.findDetailsById(id);
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

  async update(id: string, dto: UpdateFacilityDto): Promise<FacilityWithDetails> {
    const facility = await this.findById(id);
    const updatableDto = this.removeReadonlyCode(dto);

    if (updatableDto.ownerId && updatableDto.ownerId !== facility.ownerId) {
      await this.ensureOwnerCanManageFacility(updatableDto.ownerId);
    }

    await this.ensureUniqueFacilityIdentity(updatableDto, facility.id);

    Object.assign(facility, updatableDto);
    const saved = await this.facilitiesRepository.save(facility);
    return this.findDetailsById(saved.id);
  }

  async lookup(query?: LookupFacilityDto): Promise<FacilityLookup[]> {
    return this.facilitiesRepository.lookup(query);
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

  private async ensureOwnerCanManageFacility(ownerId?: string): Promise<void> {
    if (!ownerId) return;

    const ownerExists = await this.facilitiesRepository.existsActiveOwner(ownerId);
    if (!ownerExists) {
      throw new BadRequestException('ownerId khong ton tai hoac staff dang ngung hoat dong');
    }
  }

  private async ensureUniqueFacilityIdentity(
    dto: Partial<Pick<CreateFacilityDto, 'name' | 'email' | 'phone'>> & { code?: string },
    excludeId?: string,
  ): Promise<void> {
    const checks: Array<Promise<Facility | null>> = [];

    if (dto.code) checks.push(this.facilitiesRepository.findByCode(dto.code));
    if (dto.name) checks.push(this.facilitiesRepository.findByName(dto.name));
    if (dto.email) checks.push(this.facilitiesRepository.findByEmail(dto.email));
    if (dto.phone) checks.push(this.facilitiesRepository.findByPhone(dto.phone));

    const existingFacilities = await Promise.all(checks);
    const duplicated = existingFacilities.some(facility => facility && facility.id !== excludeId);
    if (duplicated) {
      throw new ConflictException(RESPONSE_MESSAGES.FACILITY_ALREADY_EXISTS);
    }
  }

  private async generateFacilityCode(province: string): Promise<string> {
    const prefix = `CS-${this.buildProvinceAbbreviation(province)}`;
    const existingCodes = await this.facilitiesRepository.findCodesByPrefix(prefix);
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nextSequence = existingCodes.reduce((maxSequence, code) => {
      const match = code.match(new RegExp(`^${escapedPrefix}-(\\d+)$`));
      return match ? Math.max(maxSequence, Number(match[1])) : maxSequence;
    }, 0) + 1;

    return `${prefix}-${String(nextSequence).padStart(2, '0')}`;
  }

  private buildProvinceAbbreviation(province: string): string {
    const normalizedProvince = this.normalizeVietnameseText(province)
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(THANH PHO|TINH|TP)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalizedProvince.split(' ').filter(Boolean);
    if (words.length === 0) return 'VN';
    return words.map(word => word[0]).join('').toUpperCase();
  }

  private normalizeVietnameseText(value: string): string {
    return String(value)
      .trim()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  private removeReadonlyCode(dto: UpdateFacilityDto): UpdateFacilityDto {
    const { code: _readonlyCode, ...updatableDto } = dto as UpdateFacilityDto & { code?: string };
    return updatableDto;
  }


  
}
