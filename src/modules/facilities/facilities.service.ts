import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Facility } from './entities/facilities.entity';
import { CreateFacilityDto } from './dto/requests/create-facility.dto';
import { UpdateFacilityDto } from './dto/requests/update-facility.dto';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectRepository(Facility)
    private readonly facilityRepository: Repository<Facility>,
  ) {}

  async create(dto: CreateFacilityDto): Promise<Facility> {
    const existing = await this.findByCode(dto.code);
    if (existing) {
      throw new ConflictException('Facility code already exists');
    }

    const facility = this.facilityRepository.create(dto);
    return this.facilityRepository.save(facility);
  }

  findAll(): Promise<Facility[]> {
    return this.facilityRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Facility> {
    const facility = await this.facilityRepository.findOne({ where: { id } });
    if (!facility) {
      throw new NotFoundException('Facility not found');
    }

    return facility;
  }

  findByCode(code: string): Promise<Facility | null> {
    return this.facilityRepository.findOne({ where: { code } });
  }

  async findByName(name: string): Promise<Facility | null> {
    return this.facilityRepository.findOne({ where: { name } });
  }

  async update(id: string, dto: UpdateFacilityDto): Promise<Facility> {
    const facility = await this.findById(id);

    if (dto.code && dto.code !== facility.code) {
      const existing = await this.findByCode(dto.code);
      if (existing) {
        throw new ConflictException('Facility code already exists');
      }
    }

    Object.assign(facility, dto);
    return this.facilityRepository.save(facility);
  }

  async remove(id: string): Promise<void> {
    const facility = await this.findById(id);
    await this.facilityRepository.remove(facility);
  }
}
