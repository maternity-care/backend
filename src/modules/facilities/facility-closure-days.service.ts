import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFacilityClosureDayDto, SearchFacilityClosureDayDto, UpdateFacilityClosureDayDto } from './dto/requests/facility-closure-day.dto';
import { ActiveStatus } from '../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { FacilityClosureDay } from './entities/facility-closure-day.entity';
import { IFacilityClosureDaysRepository, FACILITY_CLOSURE_DAYS_REPOSITORY } from './interfaces/facility-closure-days-repository.interface';
import { IFacilitiesRepository, FACILITIES_REPOSITORY } from './interfaces/facility-repository.interface';

@Injectable()
export class FacilityClosureDaysService {
  constructor(
    @Inject(FACILITY_CLOSURE_DAYS_REPOSITORY)
    private readonly closureDaysRepository: IFacilityClosureDaysRepository,
    @Inject(FACILITIES_REPOSITORY)
    private readonly facilitiesRepository: IFacilitiesRepository,
  ) {}

  async getClosureDays(id: string, query?: SearchFacilityClosureDayDto) {
    await this.ensureFacilityExists(id);
    this.ensureValidClosureDateRange(query);
    return this.closureDaysRepository.findClosureDaysByFacilityId(id, query);
  }

  async getClosureDaysInternal(id: string) {
    return this.closureDaysRepository.findClosureDaysByFacilityId(id);
  }

  async createClosureDay(id: string, dto: CreateFacilityClosureDayDto) {
    await this.ensureFacilityExists(id);
    await this.ensureUniqueClosureDate(id, dto.closureDate);

    const closureDay = this.closureDaysRepository.createClosureDay({
      facilityId: id,
      closureDate: dto.closureDate,
      reason: dto.reason ?? null,
      status: dto.status ?? ActiveStatus.ACTIVE,
    });
    const saved = await this.closureDaysRepository.saveClosureDay(closureDay);
    return this.toClosureDayResponse(saved);
  }

  async updateClosureDay(id: string, closureDayId: string, dto: UpdateFacilityClosureDayDto) {
    await this.ensureFacilityExists(id);
    const closureDay = await this.findClosureDayOrFail(id, closureDayId);

    if (dto.closureDate && dto.closureDate !== closureDay.closureDate) {
      await this.ensureUniqueClosureDate(id, dto.closureDate, closureDay.id);
      closureDay.closureDate = dto.closureDate;
    }

    if (dto.reason !== undefined) {
      closureDay.reason = dto.reason ?? null;
    }

    if (dto.status !== undefined) {
      closureDay.status = dto.status;
    }

    const saved = await this.closureDaysRepository.saveClosureDay(closureDay);
    return this.toClosureDayResponse(saved);
  }

  async removeClosureDay(id: string, closureDayId: string) {
    await this.ensureFacilityExists(id);
    const closureDay = await this.findClosureDayOrFail(id, closureDayId);
    await this.closureDaysRepository.removeClosureDay(closureDay);
    return this.toClosureDayResponse(closureDay);
  }

  private async ensureFacilityExists(id: string): Promise<void> {
    const facility = await this.facilitiesRepository.findById(id);
    if (!facility) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }
  }

  private ensureValidClosureDateRange(query?: SearchFacilityClosureDayDto): void {
    if (!query?.fromDate || !query?.toDate) return;
    if (query.fromDate > query.toDate) {
      throw new BadRequestException(RESPONSE_MESSAGES.FACILITIES.DATE_RANGE_INVALID);
    }
  }

  private async ensureUniqueClosureDate(
    facilityId: string,
    closureDate: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.closureDaysRepository.findClosureDayByDate(facilityId, closureDate);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({
        message: RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.ALREADY_EXISTS,
        data: {
          duplicatedField: 'closureDate',
          duplicatedData: this.toClosureDayResponse(existing),
        },
      });
    }
  }

  private async findClosureDayOrFail(facilityId: string, closureDayId: string): Promise<FacilityClosureDay> {
    const closureDay = await this.closureDaysRepository.findClosureDayById(facilityId, closureDayId);
    if (!closureDay) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.NOT_FOUND);
    }
    return closureDay;
  }

  private toClosureDayResponse(closureDay: FacilityClosureDay) {
    return {
      id: closureDay.id,
      facilityId: closureDay.facilityId,
      closureDate: closureDay.closureDate,
      reason: closureDay.reason,
      status: closureDay.status,
    };
  }
}
