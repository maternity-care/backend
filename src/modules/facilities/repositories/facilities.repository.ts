import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Facility } from '../entities/facilities.entity';
import { IFacilitiesRepository } from '../interfaces/facility-repository.interface';
import { SearchFacilityDto } from '../dto/requests/search-facility.dto';
@Injectable()
export class FacilitiesRepository implements IFacilitiesRepository {
  constructor(
    @InjectRepository(Facility)
    private readonly repository: Repository<Facility>,
  ) {}

  create(data: DeepPartial<Facility>): Facility {
    return this.repository.create(data);
  }

  save(facility: Facility): Promise<Facility> {
    return this.repository.save(facility);
  }

  findAll(filters?: SearchFacilityDto): Promise<Facility[]> {
    const query = this.repository.createQueryBuilder('facility');

    if (filters?.search) {
      query.andWhere(
        '(LOWER(facility.name) LIKE LOWER(:search) OR LOWER(facility.address) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.city) {
      // Tìm theo tỉnh / thành phố, match cả province hoặc district nếu cần
      query.andWhere(
        '(LOWER(facility.province) LIKE LOWER(:city) OR LOWER(facility.district) LIKE LOWER(:city))',
        { city: `%${filters.city}%` },
      );
    }

    if (filters?.status) {
      query.andWhere('facility.status = :status', { status: filters.status });
    }

    return query.orderBy('facility.createdAt', 'DESC').getMany();
  }

  findById(id: string): Promise<Facility | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Facility | null> {
    return this.repository.findOne({ where: { code } });
  }

  findByName(name: string): Promise<Facility | null> {
    return this.repository.findOne({ where: { name } });
  }

  async remove(facility: Facility): Promise<void> {
    await this.repository.remove(facility);
  }

  async updateStatus(id: string, status: string): Promise<Facility> {
    const facility = await this.findById(id);
    if (!facility) {
      throw new Error('Facility not found');
    }
    facility.status = status;
    return this.repository.save(facility);
  }
}
