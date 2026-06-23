import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Facility } from '../entities/facilities.entity';
import { IFacilitiesRepository } from '../interfaces/facility-repository.interface';

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

  findAll(): Promise<Facility[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
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
}
