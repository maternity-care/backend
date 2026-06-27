import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Facility } from '../entities/facilities.entity';
import { IFacilitiesRepository } from '../interfaces/facility-repository.interface';
import { SearchFacilityDto } from '../dto/requests/search-facility.dto';
import { paginate } from '../../../common/helpers/pagination';
import {FACILITY_CONSTANT} from '../../../common/constants/facility.constant';

@Injectable()
export class FacilitiesRepository implements IFacilitiesRepository {
  constructor(
    @InjectRepository(Facility)
    private readonly repository: Repository<Facility>,
  ) {}

  create(data: DeepPartial<Facility>): Facility {
    return this.repository.create(data);
  }

  async findAllPaginated(filters?: SearchFacilityDto) {
    const query = this.repository.createQueryBuilder('facility');

    if (filters?.search) {
      query.andWhere(
        '(LOWER(facility.name) LIKE LOWER(:search) OR LOWER(facility.address) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.city) {
      query.andWhere(
        '(LOWER(facility.province) LIKE LOWER(:city) OR LOWER(facility.district) LIKE LOWER(:city))',
        { city: `%${filters.city}%` },
      );
    }

    if (filters?.status) {
      query.andWhere('facility.status = :status', { status: filters.status });
    }

    query.orderBy('facility.createdAt', 'DESC');

    return paginate(query, { page: filters?.page, limit: filters?.limit });
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

  //test raw mysql query
  // async getFacilitiesWithRawQuery(filters?: SearchFacilityDto): Promise<Facility[]> {
  //   let query = 'Select * from facilities where 1=1';
  //   const params: any[] = [];

  //   if(filters?.search){
  //     query += ' and (LOWER(name) LIKE LOWER(?) OR LOWER(address) LIKE LOWER(?))';
  //     params.push(`%${filters.search}%`, `%${filters.search}%`);
  //   }

  //   if(filters?.city){
  //     query += ' and (LOWER(province) LIKE LOWER(?) OR LOWER(district) LIKE LOWER(?))';
  //     params.push(`%${filters.city}%`, `%${filters.city}%`);
  //   }

  //   if(filters?.status){
  //     query += ' and status = ?';
  //     params.push(filters.status);
  //   }
  //   query += ' order by created_at desc';


  //   const excutedQuery = await this.repository.query(query, params);
  //   return excutedQuery;
  
  // }

  

  async updateStatus(id: string, status: string): Promise<Facility> {
    const facility = await this.findById(id);
    if (!facility) {
      throw new Error(FACILITY_CONSTANT.FACILITY_NOT_FOUND);
    }
    facility.status = status;
    return this.repository.save(facility);
  }
}
