import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { ActiveStatus, FacilityStatus } from '../../common/constants/status.enum';
import { PaginationResult } from '../../common/helpers/pagination';
import { ShiftSlot } from '../../database/entities/shift-slot.entity';
import { FacilitiesService } from '../facilities/facilities.service';
import { CreateShiftSlotDto } from './dto/requests/create-shift-slot.dto';
import { LookupShiftSlotDto, SearchShiftSlotDto } from './dto/requests/search-shift-slot.dto';
import { UpdateShiftSlotDto } from './dto/requests/update-shift-slot.dto';

const SHIFT_SLOT_NOT_FOUND = 'Khung ca khong ton tai';
const SHIFT_SLOT_DUPLICATED = 'Khung ca da ton tai trong pham vi nay';

@Injectable()
export class ShiftSlotsService {
  constructor(
    @InjectRepository(ShiftSlot)
    private readonly repository: Repository<ShiftSlot>,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  /** Tao khung ca mau. facilityId null nghia la slot global dung chung moi co so. */
  async create(dto: CreateShiftSlotDto): Promise<ShiftSlot> {
    await this.ensureFacilityCanUseSlot(dto.facilityId ?? null);
    const code = await this.generateUniqueCode(dto.name, dto.facilityId ?? null);
    await this.ensureUniqueSlot(dto.name, dto.facilityId ?? null);

    const slot = this.repository.create({
      facilityId: dto.facilityId ?? null,
      code,
      name: dto.name,
      startTime: dto.startTime,
      endTime: dto.endTime,
      isOvernight: dto.isOvernight ?? false,
      status: dto.status ?? ActiveStatus.ACTIVE,
    });

    return this.repository.save(slot);
  }

  /** Lay danh sach khung ca de quan ly, co ho tro search/filter/page. */
  async findAll(filters?: SearchShiftSlotDto): Promise<ShiftSlot[]> {
    const slots = await this.buildListQuery(filters).getMany();
    this.ensureFound(slots);
    return slots;
  }

  /** Lay danh sach khung ca co phan trang. */
  async findAllPaginated(filters?: SearchShiftSlotDto): Promise<PaginationResult<ShiftSlot>> {
    const query = this.buildListQuery(filters);
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.max(1, Number(filters?.limit) || 20);
    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    this.ensureFound(items);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Lookup cho FE chon slot khi tao ca truc: tra slot global + slot rieng cua co so neu co facilityId. */
  async lookup(filters?: LookupShiftSlotDto): Promise<ShiftSlot[]> {
    const query = this.repository
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.facility', 'facility')
      .where('slot.deletedAt IS NULL')
      .andWhere('slot.status = :status', { status: filters?.status ?? ActiveStatus.ACTIVE })
      .orderBy('slot.startTime', 'ASC')
      .addOrderBy('slot.endTime', 'ASC')
      .addOrderBy('slot.name', 'ASC')
      .take(Math.max(1, Number(filters?.limit) || 20));

    if (filters?.facilityId) {
      await this.ensureFacilityCanUseSlot(filters.facilityId);
      query.andWhere(new Brackets(qb => {
        qb.where('slot.facilityId IS NULL')
          .orWhere('slot.facilityId = :facilityId', { facilityId: filters.facilityId });
      }));
    } else {
      query.andWhere('slot.facilityId IS NULL');
    }

    if (filters?.search) {
      query.andWhere(
        '(LOWER(slot.name) LIKE LOWER(:search) OR LOWER(slot.code) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    return query.getMany();
  }

  /** Lay chi tiet mot slot. */
  async findById(id: string): Promise<ShiftSlot> {
    this.validateId(id);
    const slot = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: { facility: true },
    });
    if (!slot) throw new NotFoundException(SHIFT_SLOT_NOT_FOUND);
    return slot;
  }

  /** Cap nhat slot. Neu doi facility/name thi backend se sinh lai code neu can. */
  async update(id: string, dto: UpdateShiftSlotDto): Promise<ShiftSlot> {
    const slot = await this.findById(id);
    const targetFacilityId = dto.facilityId !== undefined ? dto.facilityId ?? null : slot.facilityId;
    await this.ensureFacilityCanUseSlot(targetFacilityId);

    if (dto.name && (dto.name !== slot.name || targetFacilityId !== slot.facilityId)) {
      await this.ensureUniqueSlot(dto.name, targetFacilityId, slot.id);
      slot.code = await this.generateUniqueCode(dto.name, targetFacilityId, slot.id);
      slot.name = dto.name;
    }

    if (dto.facilityId !== undefined) slot.facilityId = dto.facilityId ?? null;
    if (dto.startTime !== undefined) slot.startTime = dto.startTime;
    if (dto.endTime !== undefined) slot.endTime = dto.endTime;
    if (dto.isOvernight !== undefined) slot.isOvernight = dto.isOvernight;
    if (dto.status !== undefined) slot.status = dto.status;

    return this.repository.save(slot);
  }

  /** Xoa an toan: chua co shifts thi hard delete, da duoc dung thi soft delete + inactive. */
  async remove(id: string) {
    const slot = await this.findById(id);
    const dependencyCount = await this.countShiftDependencies(slot.id);
    if (dependencyCount === 0) {
      await this.repository.remove(slot);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    slot.status = ActiveStatus.INACTIVE;
    slot.deletedAt = new Date();
    await this.repository.save(slot);
    return { action: 'soft_deleted', affectedCount: dependencyCount };
  }

  private buildListQuery(filters?: SearchShiftSlotDto): SelectQueryBuilder<ShiftSlot> {
    const query = this.repository
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.facility', 'facility')
      .where('slot.deletedAt IS NULL')
      .orderBy('slot.startTime', 'ASC')
      .addOrderBy('slot.endTime', 'ASC')
      .addOrderBy('slot.createdAt', 'DESC');

    if (filters?.facilityId) {
      query.andWhere('slot.facilityId = :facilityId', { facilityId: filters.facilityId });
    }

    if (filters?.status) {
      query.andWhere('slot.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(LOWER(slot.name) LIKE LOWER(:search) OR LOWER(slot.code) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    return query;
  }

  private async ensureFacilityCanUseSlot(facilityId: string | null): Promise<void> {
    if (!facilityId) return;
    const facility = await this.facilitiesService.findById(facilityId);
    if (facility.status !== FacilityStatus.ACTIVE) {
      throw new BadRequestException('Co so khong ton tai hoac dang ngung hoat dong');
    }
  }

  private async ensureUniqueSlot(name: string, facilityId: string | null, excludeId?: string): Promise<void> {
    const query = this.repository
      .createQueryBuilder('slot')
      .where('LOWER(slot.name) = LOWER(:name)', { name })
      .andWhere('slot.deletedAt IS NULL');

    if (facilityId) query.andWhere('slot.facilityId = :facilityId', { facilityId });
    else query.andWhere('slot.facilityId IS NULL');
    if (excludeId) query.andWhere('slot.id != :excludeId', { excludeId });

    const existing = await query.getOne();
    if (existing) {
      throw new ConflictException({
        message: SHIFT_SLOT_DUPLICATED,
        data: {
          duplicatedField: 'name',
          duplicatedData: existing,
        },
      });
    }
  }

  private async generateUniqueCode(name: string, facilityId: string | null, excludeId?: string): Promise<string> {
    const baseCode = this.buildCodePrefixFromName(name);
    const existingCodes = await this.findCodesByPrefix(baseCode, facilityId, excludeId);
    if (!existingCodes.includes(baseCode)) return baseCode;

    for (let index = 2; index <= 99; index += 1) {
      const code = `${baseCode}_${String(index).padStart(2, '0')}`;
      if (!existingCodes.includes(code)) return code;
    }

    throw new ConflictException('Khong the sinh code khung ca duy nhat');
  }

  private async findCodesByPrefix(prefix: string, facilityId: string | null, excludeId?: string): Promise<string[]> {
    const query = this.repository
      .createQueryBuilder('slot')
      .withDeleted()
      .select('slot.code', 'code')
      .where('slot.code LIKE :pattern', { pattern: `${prefix}%` });

    if (facilityId) query.andWhere('slot.facilityId = :facilityId', { facilityId });
    else query.andWhere('slot.facilityId IS NULL');
    if (excludeId) query.andWhere('slot.id != :excludeId', { excludeId });

    const rows = await query.getRawMany<{ code: string }>();
    return rows.map(row => row.code);
  }

  private buildCodePrefixFromName(name: string): string {
    const normalized = String(name)
      .trim()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    return normalized ? normalized.split(' ').join('_').slice(0, 40) : 'SHIFT_SLOT';
  }

  private async countShiftDependencies(slotId: string): Promise<number> {
    const row = await this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('shifts', 'shift')
      .where('shift.slot_id = :slotId', { slotId })
      .getRawOne<{ count: string }>();

    return Number(row?.count ?? 0);
  }

  private validateId(id: string): void {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('shiftSlotId phai la so nguyen duong');
    }
  }

  private ensureFound(slots: ShiftSlot[]): void {
    if (!slots || slots.length === 0) {
      throw new NotFoundException(SHIFT_SLOT_NOT_FOUND);
    }
  }
}
