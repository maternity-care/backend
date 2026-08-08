import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { FacilityClosureDay } from '../entities/facility-closure-day.entity';
import { IFacilityClosureDaysRepository } from '../interfaces/facility-closure-days-repository.interface';
import { SearchFacilityClosureDayDto } from '../dto/requests/facility-closure-day.dto';

@Injectable()
export class FacilityClosureDaysRepository implements IFacilityClosureDaysRepository {
  constructor(
    @InjectRepository(FacilityClosureDay)
    private readonly closureDayRepository: Repository<FacilityClosureDay>,
  ) {}

  createClosureDay(data: DeepPartial<FacilityClosureDay>): FacilityClosureDay {
    return this.closureDayRepository.create(data);
  }

  saveClosureDay(closureDay: FacilityClosureDay): Promise<FacilityClosureDay> {
    return this.closureDayRepository.save(closureDay);
  }

  async removeClosureDay(closureDay: FacilityClosureDay): Promise<void> {
    await this.closureDayRepository.remove(closureDay);
  }

  async findClosureDaysByFacilityId(
    facilityId: string,
    filters?: SearchFacilityClosureDayDto,
  ): Promise<Array<{ id: string; facilityId: string; closureDate: string; reason: string | null; status: string }>> {
    const query = this.closureDayRepository
      .createQueryBuilder('closureDay')
      .select('closureDay.id', 'id')
      .addSelect('closureDay.facilityId', 'facilityId')
      .addSelect('closureDay.closureDate', 'closureDate')
      .addSelect('closureDay.reason', 'reason')
      .addSelect('closureDay.status', 'status')
      .where('closureDay.facilityId = :facilityId', { facilityId });

    if (filters?.fromDate) {
      query.andWhere('closureDay.closureDate >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters?.toDate) {
      query.andWhere('closureDay.closureDate <= :toDate', { toDate: filters.toDate });
    }

    if (filters?.status) {
      query.andWhere('closureDay.status = :status', { status: filters.status });
    }

    return query.orderBy('closureDay.closureDate', 'ASC').getRawMany();
  }

  findClosureDayById(facilityId: string, closureDayId: string): Promise<FacilityClosureDay | null> {
    return this.closureDayRepository.findOne({
      where: {
        id: closureDayId,
        facilityId,
      },
    });
  }

  findClosureDayByDate(facilityId: string, closureDate: string): Promise<FacilityClosureDay | null> {
    return this.closureDayRepository.findOne({
      where: {
        facilityId,
        closureDate,
      },
    });
  }
}
