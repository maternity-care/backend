import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BulkCreateRoomsDto,
  BulkCreateRoomsPreviewDto,
  CreateRoomDto,
} from './dto/requests/create-room.dto';
import { CreateRoomTypeDto } from './dto/requests/create-room-type.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';
import { UpdateRoomTypeDto } from './dto/requests/update-room-type.dto';
import { Room } from './entities/room.entity';
import { RoomType } from '../../database/entities/room-type.entity';
import { Facility } from '../facilities/entities/facility.entity';
import {
  IRoomsRepository,
  ROOMS_REPOSITORY,
  FacilityRoomType,
  RoomLookup,
  RoomTypeDetails,
  RoomTypeLookup,
  RoomWithDetails,
} from './interfaces/rooms-repository.interface';
import {
  BulkCreateRoomsConfirmResult,
  BulkCreateRoomsPlan,
  BulkCreateRoomsPreviewResult,
  BulkRoomPreviewItem,
} from './interfaces/bulk-create-rooms.interface';
import { FacilitiesService } from '../facilities/facilities.service';
import {
  LookupRoomsDto,
  LookupRoomTypesDto,
  SearchRoomsDto,
  SearchRoomTypesDto,
} from './dto/requests/search-rooms.dto';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { ActiveStatus, FacilityStatus } from '../../common/constants/status.enum';
import { SuspendResourceDto } from '../../common/dto/suspend-resource.dto';

@Injectable()
export class RoomsService {
  constructor(
    @Inject(ROOMS_REPOSITORY)
    private readonly roomsRepository: IRoomsRepository,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  async create(dto: CreateRoomDto): Promise<RoomWithDetails> {
    const facility = await this.validateRoomPayload(dto);
    const code = await this.generateRoomCode(facility);
    const room = this.roomsRepository.create({ ...dto, code });
    const saved = await this.roomsRepository.save(room);
    return this.findDetailsById(saved.id);
  }

  async bulkCreate(dto: BulkCreateRoomsDto): Promise<RoomWithDetails[]> {
    this.ensureNoDuplicateRoomsInPayload(dto.rooms);
    const facilities = await Promise.all(dto.rooms.map((room) => this.validateRoomPayload(room)));

    const codeSequenceCache = new Map<string, number>();
    const rooms = await Promise.all(
      dto.rooms.map(async (room, index) =>
        this.roomsRepository.create({
          ...room,
          code: await this.generateRoomCode(facilities[index], codeSequenceCache),
        }),
      ),
    );
    const savedRooms = await this.roomsRepository.saveMany(rooms);
    return Promise.all(savedRooms.map((room) => this.findDetailsById(room.id)));
  }

  /**
   * Preview bulk-create rooms:
   * - Kiem tra facility, roomType, trung ten trong payload/DB.
   * - Sinh code du kien cho tung phong hop le.
   * - Khong luu DB, chi tra plan de FE hien thi cho nguoi dung confirm.
   */
  async previewBulkCreate(dto: BulkCreateRoomsPreviewDto): Promise<BulkCreateRoomsPreviewResult> {
    const plan = await this.buildBulkCreatePlan(dto);
    const { internalValidEntities: _internalValidEntities, ...response } = plan;
    return response;
  }

  /**
   * Confirm bulk-create rooms:
   * - Chay lai validation nhu preview de tranh du lieu da thay doi sau luc preview.
   * - Mac dinh saveOnlyValid=true: chi luu cac dong hop le.
   * - Neu saveOnlyValid=false va con loi thi khong luu dong nao.
   */
  async confirmBulkCreate(dto: BulkCreateRoomsPreviewDto): Promise<BulkCreateRoomsConfirmResult> {
    const plan = await this.buildBulkCreatePlan(dto);
    if (plan.internalValidEntities.length === 0) {
      throw new BadRequestException(RESPONSE_MESSAGES.ROOMS.BULK_NO_VALID_ROOM);
    }

    if (
      dto.saveOnlyValid === false &&
      (plan.skippedItems.length > 0 || plan.conflictItems.length > 0)
    ) {
      throw new BadRequestException(RESPONSE_MESSAGES.ROOMS.BULK_STRICT_HAS_ISSUES);
    }

    const savedRooms = await this.roomsRepository.saveMany(plan.internalValidEntities);
    const createdRooms = await Promise.all(savedRooms.map((room) => this.findDetailsById(room.id)));
    const { internalValidEntities: _internalValidEntities, ...response } = plan;
    return {
      ...response,
      createdRooms,
    };
  }

  async findAll(filters?: SearchRoomsDto): Promise<RoomWithDetails[]> {
    const rooms = await this.roomsRepository.findAll(filters);
    if (!rooms || rooms.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.ROOMS.NOT_FOUND);
    }
    return rooms;
  }

  async findAllPaginated(filters: SearchRoomsDto) {
    const result = await this.roomsRepository.findAllPaginated!(filters);
    if (!result || !result.items || result.items.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.ROOMS.NOT_FOUND);
    }
    return result;
  }

  async createRoomType(dto: CreateRoomTypeDto): Promise<RoomTypeDetails> {
    await this.ensureRoomTypeNameUnique(dto.name);
    const code = await this.generateRoomTypeCode(dto.name);
    const roomType = this.roomsRepository.createRoomType({
      ...dto,
      code,
      status: dto.status ?? ActiveStatus.ACTIVE,
    });
    return this.roomsRepository.saveRoomType(roomType);
  }

  async findAllRoomTypes(filters?: SearchRoomTypesDto): Promise<RoomTypeDetails[]> {
    const roomTypes = await this.roomsRepository.findAllRoomTypes(filters);
    if (!roomTypes || roomTypes.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.ROOM_TYPES.NOT_FOUND);
    }
    return roomTypes;
  }

  async findAllRoomTypesPaginated(filters?: SearchRoomTypesDto) {
    const result = await this.roomsRepository.findAllRoomTypesPaginated!(filters);
    if (!result || !result.items || result.items.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.ROOM_TYPES.NOT_FOUND);
    }
    return result;
  }

  async findRoomTypeById(id: string): Promise<RoomType> {
    const roomType = await this.roomsRepository.findRoomTypeById(id);
    if (!roomType) {
      throw new NotFoundException(RESPONSE_MESSAGES.ROOM_TYPES.NOT_FOUND);
    }
    return roomType;
  }

  async updateRoomType(id: string, dto: UpdateRoomTypeDto): Promise<RoomTypeDetails> {
    const roomType = await this.findRoomTypeById(id);
    if (dto.name && dto.name !== roomType.name) {
      await this.ensureRoomTypeNameUnique(dto.name, roomType.id);
    }

    Object.assign(roomType, dto);
    return this.roomsRepository.saveRoomType(roomType);
  }

  async removeRoomType(id: string): Promise<SafeRemoveResult> {
    const roomType = await this.findRoomTypeById(id);
    const dependencyCount = await this.roomsRepository.countRoomTypeDependencies(roomType.id);
    if (dependencyCount === 0) {
      await this.roomsRepository.removeRoomType(roomType);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    throw new ConflictException({
      message: RESPONSE_MESSAGES.ROOM_TYPES.IN_USE,
      data: { affectedCount: dependencyCount },
    });
  }

  async findById(id: string): Promise<Room> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException(RESPONSE_MESSAGES.ROOMS.NOT_FOUND);
    }
    return this.reactivateExpiredRoomIfNeeded(room);
  }

  async findDetailsById(id: string): Promise<RoomWithDetails> {
    await this.reactivateExpiredRoomById(id);
    const room = await this.roomsRepository.findDetailsById(id);
    if (!room) {
      throw new NotFoundException(RESPONSE_MESSAGES.ROOMS.NOT_FOUND);
    }
    return room;
  }

  findByName(name: string): Promise<Room | null> {
    return this.roomsRepository.findByName(name);
  }

  async update(id: string, dto: UpdateRoomDto): Promise<RoomWithDetails> {
    const room = await this.findById(id);

    if (dto.roomTypeId) {
      await this.validateRoomType(dto.roomTypeId);
    }

    if (dto.name && dto.name !== room.name) {
      await this.ensureRoomNameUnique(room.facilityId, dto.name, room.id);
    }

    Object.assign(room, dto);
    const saved = await this.roomsRepository.save(room);
    return this.findDetailsById(saved.id);
  }

  async suspend(
    id: string,
    dto: SuspendResourceDto,
    actorId?: string | null,
  ): Promise<{ room: RoomWithDetails; impact: { affectedShifts: number; affectedAppointments: number } }> {
    const room = await this.findById(id);
    const now = new Date();
    const inactiveUntil = this.parseInactiveUntil(dto.inactiveUntil, 'inactiveUntil phai lon hon thoi diem hien tai');
    const impact = await this.roomsRepository.countSuspendImpact(room.id, now, inactiveUntil);

    room.status = ActiveStatus.INACTIVE;
    room.inactiveFrom = now;
    room.inactiveUntil = inactiveUntil;
    room.inactiveReason = dto.reason ?? null;
    room.inactiveBy = actorId ?? null;
    room.reactivatedAt = null;
    room.reactivatedBy = null;
    await this.roomsRepository.save(room);

    return {
      room: await this.findDetailsById(room.id),
      impact,
    };
  }

  async reactivate(
    id: string,
    actorId?: string | null,
  ): Promise<{ room: RoomWithDetails }> {
    const room = await this.findById(id);
    room.status = ActiveStatus.ACTIVE;
    room.reactivatedAt = new Date();
    room.reactivatedBy = actorId ?? null;
    await this.roomsRepository.save(room);

    return {
      room: await this.findDetailsById(room.id),
    };
  }

  async remove(id: string, reason?: string, deletedBy?: string | null): Promise<SafeRemoveResult> {
    const room = await this.findById(id);
    const dependencyCount = await this.roomsRepository.countDependencies(room.id);
    if (dependencyCount === 0) {
      await this.roomsRepository.remove(room);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    await this.roomsRepository.softDelete(room, reason, deletedBy);
    return { action: 'soft_deleted', affectedCount: dependencyCount };
  }

  async findByFacilityId(
    facilityId: string,
    filters?: SearchRoomsDto,
  ): Promise<{ facility: Facility; rooms: RoomWithDetails[] }> {
    const facility = await this.facilitiesService.findById(facilityId);
    if (!facility) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITY_NOT_FOUND);
    }

    // nếu client gửi page => trả về phân trang
    if (filters?.page) {
      const paged = await this.roomsRepository.findByFacilityIdPaginated!(facilityId, filters);
      if (!paged || !paged.items || paged.items.length === 0) {
        throw new NotFoundException(RESPONSE_MESSAGES.ROOMS.NOT_FOUND);
      }
      return {
        facility,
        rooms: paged as any,
      } as any;
    }

    const rooms = await this.roomsRepository.findByFacilityId(facilityId, filters);
    if (!rooms || rooms.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.ROOMS.NOT_FOUND);
    }

    return {
      facility,
      rooms,
    };
  }

  async findAllWithRooms(
    facility?: string,
    opts?: { facilityPage?: number; facilityLimit?: number; roomPage?: number; roomLimit?: number },
  ): Promise<any> {
    // nếu paginate facilities
    if (opts?.facilityPage) {
      const facilitiesPaged = await this.facilitiesService.findAllPaginated({
        page: opts.facilityPage,
        limit: opts.facilityLimit,
      } as any);
      const items = await Promise.all(
        facilitiesPaged.items.map(async (facility) => {
          if (opts?.roomPage || opts?.roomLimit) {
            const roomsPaged = await this.roomsRepository.findByFacilityIdPaginated!(facility.id, {
              page: opts.roomPage,
              limit: opts.roomLimit,
            } as any);
            return { facility, rooms: roomsPaged };
          }
          const rooms = await this.roomsRepository.findByFacilityId(facility.id);
          return { facility, rooms };
        }),
      );

      return {
        ...facilitiesPaged,
        items,
      };
    }

    const facilities = await this.facilitiesService.findAll();
    if (!facilities || facilities.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITY_NOT_FOUND);
    }

    const result = await Promise.all(
      facilities.map(async (facility) => {
        try {
          if (opts?.roomPage || opts?.roomLimit) {
            const roomsPaged = await this.roomsRepository.findByFacilityIdPaginated!(facility.id, {
              page: opts.roomPage,
              limit: opts.roomLimit,
            } as any);
            return { facility, rooms: roomsPaged };
          }
          const rooms = await this.roomsRepository.findByFacilityId(facility.id);
          return { facility, rooms };
        } catch (error) {
          return { facility, rooms: [] };
        }
      }),
    );

    return result;
  }

  lookup(filters?: LookupRoomsDto): Promise<RoomLookup[]> {
    return this.roomsRepository.lookup(filters);
  }

  lookupRoomTypes(filters?: LookupRoomTypesDto): Promise<RoomTypeLookup[]> {
    return this.roomsRepository.lookupRoomTypes(filters);
  }

  async findRoomTypesByFacilityId(
    facilityId: string,
    filters?: LookupRoomTypesDto,
  ): Promise<FacilityRoomType[]> {
    await this.facilitiesService.findById(facilityId);
    const roomTypes = await this.roomsRepository.findRoomTypesByFacilityId(facilityId, filters);
    if (!roomTypes || roomTypes.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.ROOM_TYPES.NOT_FOUND);
    }
    return roomTypes.map((roomType) => ({
      ...roomType,
      roomCount: Number(roomType.roomCount),
    }));
  }

  private parseInactiveUntil(value: string | null | undefined, errorMessage: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
      throw new BadRequestException(errorMessage);
    }
    return parsed;
  }

  private async reactivateExpiredRoomById(id: string): Promise<void> {
    const room = await this.roomsRepository.findById(id);
    if (!room) return;
    await this.reactivateExpiredRoomIfNeeded(room);
  }

  private async reactivateExpiredRoomIfNeeded(room: Room): Promise<Room> {
    if (
      room.status === ActiveStatus.INACTIVE &&
      room.inactiveUntil &&
      room.inactiveUntil <= new Date()
    ) {
      room.status = ActiveStatus.ACTIVE;
      room.reactivatedAt = new Date();
      room.reactivatedBy = null;
      return this.roomsRepository.save(room);
    }

    return room;
  }

  private async validateRoomPayload(dto: CreateRoomDto): Promise<Facility> {
    const { facility } = await this.validateRoomPayloadDetails(dto);
    return facility;
  }

  private async validateRoomPayloadDetails(
    dto: CreateRoomDto,
  ): Promise<{ facility: Facility; roomType: RoomType }> {
    const facility = await this.facilitiesService.findById(dto.facilityId);
    if (facility.status !== FacilityStatus.ACTIVE) {
      throw new ConflictException(RESPONSE_MESSAGES.ROOMS.FACILITY_INACTIVE);
    }

    const [roomType] = await Promise.all([
      this.validateRoomType(dto.roomTypeId),
      this.ensureRoomNameUnique(dto.facilityId, dto.name),
    ]);
    return { facility, roomType };
  }

  private async validateRoomType(roomTypeId: string): Promise<RoomType> {
    const roomType = await this.roomsRepository.findRoomTypeById(roomTypeId);
    if (!roomType || roomType.status !== ActiveStatus.ACTIVE) {
      throw new NotFoundException(RESPONSE_MESSAGES.ROOM_TYPES.ACTIVE_NOT_FOUND);
    }
    return roomType;
  }

  private async buildBulkCreatePlan(dto: BulkCreateRoomsPreviewDto): Promise<BulkCreateRoomsPlan> {
    const codeSequenceCache = new Map<string, number>();
    const payloadKeys = new Set<string>();
    const validRooms: BulkRoomPreviewItem[] = [];
    const skippedItems: BulkRoomPreviewItem[] = [];
    const conflictItems: BulkRoomPreviewItem[] = [];
    const internalValidEntities: Room[] = [];

    for (let index = 0; index < dto.rooms.length; index += 1) {
      const room = dto.rooms[index];
      const payloadKey = `${room.facilityId}:${room.name.trim().toLowerCase()}`;

      // Neu trung ngay trong payload, khong can query DB nua; FE can index de highlight dung dong loi.
      if (payloadKeys.has(payloadKey)) {
        conflictItems.push({
          index,
          input: room,
          reason: RESPONSE_MESSAGES.ROOMS.BULK_DUPLICATED_REASON,
          duplicatedField: 'name',
          duplicatedData: {
            facilityId: room.facilityId,
            name: room.name,
            roomTypeId: room.roomTypeId,
            floor: room.floor,
            status: room.status,
          },
        });
        continue;
      }
      payloadKeys.add(payloadKey);

      try {
        const { facility, roomType } = await this.validateRoomPayloadDetails(room);
        const code = await this.generateRoomCode(facility, codeSequenceCache);
        const entity = this.roomsRepository.create({ ...room, code });
        internalValidEntities.push(entity);
        validRooms.push({
          index,
          input: room,
          generatedCode: code,
          facility: {
            id: facility.id,
            code: facility.code,
            name: facility.name,
            status: facility.status,
          },
          roomType: this.toDuplicateRoomTypeData(roomType),
        });
      } catch (error) {
        const errorPayload = this.toBulkCreateRoomError(error);
        const targetItems = error instanceof ConflictException ? conflictItems : skippedItems;
        targetItems.push({
          index,
          input: room,
          ...errorPayload,
        });
      }
    }

    return {
      summary: {
        total: dto.rooms.length,
        validCount: validRooms.length,
        skippedCount: skippedItems.length,
        conflictCount: conflictItems.length,
        canConfirm:
          validRooms.length > 0 &&
          (dto.saveOnlyValid !== false ||
            (skippedItems.length === 0 && conflictItems.length === 0)),
      },
      validRooms,
      skippedItems,
      conflictItems,
      internalValidEntities,
    };
  }

  private toBulkCreateRoomError(error: unknown) {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return { reason: response };
      }

      const payload = response as { message?: string | string[]; data?: unknown };
      return {
        reason: Array.isArray(payload.message)
          ? payload.message.join('; ')
          : (payload.message ?? RESPONSE_MESSAGES.ROOMS.BULK_INVALID_ROOM_DATA),
        ...(payload.data ? { ...(payload.data as object) } : {}),
      };
    }

    return { reason: RESPONSE_MESSAGES.ROOMS.BULK_CHECK_FAILED };
  }

  private async ensureRoomTypeNameUnique(name: string, excludeId?: string): Promise<void> {
    const existing = await this.roomsRepository.findRoomTypeByName(name, excludeId);
    if (existing) {
      throw new ConflictException({
        message: RESPONSE_MESSAGES.ROOM_TYPES.ALREADY_EXISTS,
        data: {
          duplicatedField: 'name',
          duplicatedData: this.toDuplicateRoomTypeData(existing),
        },
      });
    }
  }

  private async ensureRoomNameUnique(
    facilityId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.roomsRepository.findByFacilityAndName(facilityId, name, excludeId);
    if (existing) {
      const existingDetails = await this.roomsRepository.findDetailsById(existing.id);
      throw new ConflictException({
        message: RESPONSE_MESSAGES.ROOMS.ALREADY_EXISTS,
        data: {
          duplicatedField: 'name',
          duplicatedData: this.toDuplicateRoomData(existingDetails ?? existing),
        },
      });
    }
  }

  private ensureNoDuplicateRoomsInPayload(rooms: CreateRoomDto[]): void {
    const keys = new Set<string>();
    for (const room of rooms) {
      const key = `${room.facilityId}:${room.name.trim().toLowerCase()}`;
      if (keys.has(key)) {
        throw new BadRequestException({
          message: RESPONSE_MESSAGES.ROOMS.BULK_DUPLICATED_IN_PAYLOAD,
          data: {
            duplicatedField: 'name',
            duplicatedData: {
              facilityId: room.facilityId,
              name: room.name,
              roomTypeId: room.roomTypeId,
              floor: room.floor,
              status: room.status,
            },
          },
        });
      }
      keys.add(key);
    }
  }

  private toDuplicateRoomData(room: Room | RoomWithDetails) {
    return {
      id: room.id,
      facilityId: room.facilityId,
      code: room.code,
      roomTypeId: room.roomTypeId,
      name: room.name,
      floor: room.floor,
      status: room.status,
      facilityCode: (room as RoomWithDetails).facilityCode,
      facilityName: (room as RoomWithDetails).facilityName,
      roomTypeName: (room as RoomWithDetails).roomTypeName,
      roomTypeStatus: (room as RoomWithDetails).roomTypeStatus,
    };
  }

  private toDuplicateRoomTypeData(
    roomType:
      | RoomTypeDetails
      | { id: string; name: string; description?: string; status?: ActiveStatus },
  ) {
    return {
      id: roomType.id,
      code: (roomType as RoomTypeDetails).code,
      name: roomType.name,
      description: roomType.description,
      status: roomType.status,
    };
  }

  private async generateRoomCode(
    facility: Facility,
    codeSequenceCache?: Map<string, number>,
  ): Promise<string> {
    const prefix = `R-${facility.code}`;
    const cacheKey = `${facility.id}:${prefix}`;

    if (!codeSequenceCache?.has(cacheKey)) {
      const existingCodes = await this.roomsRepository.findCodesByFacilityAndPrefix(
        facility.id,
        prefix,
      );
      const nextSequence = this.getNextSequence(existingCodes, prefix, 3);
      codeSequenceCache?.set(cacheKey, nextSequence);
      if (!codeSequenceCache) {
        return `${prefix}-${String(nextSequence).padStart(3, '0')}`;
      }
    }

    const sequence = codeSequenceCache!.get(cacheKey)!;
    codeSequenceCache!.set(cacheKey, sequence + 1);
    return `${prefix}-${String(sequence).padStart(3, '0')}`;
  }

  private async generateRoomTypeCode(name: string): Promise<string> {
    const prefix = this.buildCodePrefixFromName(name);
    const existingCodes = await this.roomsRepository.findRoomTypeCodesByPrefix(prefix);
    const nextSequence = this.getNextSequence(existingCodes, prefix, 2);

    return nextSequence === 1 && !existingCodes.includes(prefix)
      ? prefix
      : `${prefix}_${String(nextSequence).padStart(2, '0')}`;
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

    return normalized ? normalized.split(' ').join('_').slice(0, 40) : 'ROOM_TYPE';
  }

  private getNextSequence(existingCodes: string[], prefix: string, padding: number): number {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escapedPrefix}[-_](\\d+)$`);
    const maxSequence = existingCodes.reduce((max, code) => {
      if (code === prefix) return Math.max(max, 1);
      const match = code.match(pattern);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    return maxSequence + 1;
  }
}
