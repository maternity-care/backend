import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ApplyFacilityOperatingHoursDto, OperatingHoursSlotStrategy } from './dto/requests/apply-facility-operating-hours.dto';
import { FacilityOperatingHourGroupDto } from './dto/requests/facility-schedule.dto';
import { UpdateFacilityOperatingHoursDto } from './dto/requests/update-facility-operating-hours.dto';
import { FacilityClosureDaysService } from './facility-closure-days.service';
import {
  buildCurrentOperatingState,
  buildDefaultOperatingHours,
  buildOperatingHoursFromGroupedSchedules,
  FacilityOperatingHourLike,
  groupOperatingHoursForDisplay,
  todayInVietnam,
} from './helpers/facility-operating-hours.helper';
import { FACILITIES_REPOSITORY, IFacilitiesRepository, FacilityWithDetails } from './interfaces/facility-repository.interface';
import { FACILITY_OPERATING_HOURS_REPOSITORY, IFacilityOperatingHoursRepository } from './interfaces/facility-operating-hours-repository.interface';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import {
  findImpactedShiftsByOperatingHours,
  findImpactedShiftSlotsByOperatingHours,
  ImpactedShiftData,
  ImpactedShiftSlotData,
} from './validators/facility-operating-hours.validator';

type PersistableOperatingHours = Parameters<IFacilityOperatingHoursRepository['syncOperatingHours']>[1];

@Injectable()
export class FacilityOperatingHoursService {
  constructor(
    @Inject(FACILITY_OPERATING_HOURS_REPOSITORY)
    private readonly operatingHoursRepository: IFacilityOperatingHoursRepository,
    @Inject(FACILITIES_REPOSITORY)
    private readonly facilitiesRepository: IFacilitiesRepository,
    private readonly closureDaysService: FacilityClosureDaysService,
  ) {}

  async getOperatingHours(id: string) {
    await this.ensureFacilityExists(id);
    const operatingHours = await this.getOperatingHoursOrDefault(id);

    return {
      operatingHours,
      operatingHourGroups: groupOperatingHoursForDisplay(operatingHours),
    };
  }

  async previewOperatingHours(id: string, dto: UpdateFacilityOperatingHoursDto) {
    await this.ensureFacilityExists(id);
    const operatingHours = this.buildOperatingHoursFromGroupedInput(dto);
    const [impactedShifts, impactedShiftSlots] = await Promise.all([
      this.findOperatingHourImpactedShifts(id, operatingHours),
      this.findOperatingHourImpactedShiftSlots(id, operatingHours),
    ]);

    return {
      canUpdate: impactedShifts.length === 0 && impactedShiftSlots.length === 0,
      summary: {
        impactedShiftCount: impactedShifts.length,
        impactedShiftSlotCount: impactedShiftSlots.length,
      },
      operatingHours,
      operatingHourGroups: groupOperatingHoursForDisplay(operatingHours),
      impactedShifts,
      impactedShiftSlots,
    };
  }

  async updateOperatingHours(id: string, dto: UpdateFacilityOperatingHoursDto) {
    await this.ensureFacilityExists(id);
    const operatingHours = this.buildOperatingHoursFromGroupedInput(dto);

    await this.ensureOperatingHoursCompatibleWithUpcomingShifts(id, operatingHours);
    await this.operatingHoursRepository.syncOperatingHours(id, operatingHours as PersistableOperatingHours);
    return this.getOperatingHours(id);
  }

  async applyOperatingHours(id: string, dto: ApplyFacilityOperatingHoursDto) {
    await this.ensureFacilityExists(id);
    const operatingHours = this.buildOperatingHoursFromGroupedInput(dto);
    const slotStrategy = dto.slotStrategy ?? OperatingHoursSlotStrategy.STRICT;
    const [impactedShifts, impactedShiftSlots] = await Promise.all([
      this.findOperatingHourImpactedShifts(id, operatingHours),
      this.findOperatingHourImpactedShiftSlots(id, operatingHours),
    ]);

    if (impactedShifts.length > 0) {
      this.throwOperatingHoursImpactConflict(impactedShifts, impactedShiftSlots);
    }

    if (impactedShiftSlots.length > 0 && slotStrategy === OperatingHoursSlotStrategy.STRICT) {
      this.throwOperatingHoursImpactConflict(impactedShifts, impactedShiftSlots);
    }

    const deactivateShiftSlotIds = slotStrategy === OperatingHoursSlotStrategy.DEACTIVATE_INVALID_SLOTS
      ? impactedShiftSlots.map(slot => slot.id)
      : [];
    const deactivatedShiftSlotCount = await this.operatingHoursRepository.applyOperatingHours(
      id,
      operatingHours as PersistableOperatingHours,
      deactivateShiftSlotIds,
    );
    const savedOperatingHours = await this.getOperatingHours(id);

    return {
      ...savedOperatingHours,
      slotStrategy,
      summary: {
        impactedShiftCount: impactedShifts.length,
        impactedShiftSlotCount: impactedShiftSlots.length,
        deactivatedShiftSlotCount,
      },
      impactedShifts,
      impactedShiftSlots,
    };
  }

  async attachFacilitySchedule(facility: FacilityWithDetails): Promise<FacilityWithDetails> {
    const [operatingHours, closureDays] = await Promise.all([
      this.getOperatingHoursOrDefault(facility.id),
      this.closureDaysService.getClosureDaysInternal(facility.id),
    ]);
    const operatingState = buildCurrentOperatingState(facility, operatingHours, closureDays);

    return {
      ...facility,
      ...operatingState,
      operatingHours,
      operatingHourGroups: groupOperatingHoursForDisplay(operatingHours),
      closureDays,
    };
  }

  async initializeOperatingHours(facilityId: string, schedules?: FacilityOperatingHourGroupDto[]) {
    const operatingHours = this.buildOperatingHoursForCreate(schedules);
    await this.operatingHoursRepository.syncOperatingHours(facilityId, operatingHours as PersistableOperatingHours);
  }

  buildOperatingHoursForCreate(schedules?: FacilityOperatingHourGroupDto[]) {
    if (schedules?.length) {
      return buildOperatingHoursFromGroupedSchedules(schedules);
    }
    return buildDefaultOperatingHours();
  }

  private async ensureFacilityExists(id: string): Promise<void> {
    const facility = await this.facilitiesRepository.findById(id);
    if (!facility) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }
  }

  private async getOperatingHoursOrDefault(facilityId: string): Promise<FacilityOperatingHourLike[]> {
    const operatingHours = await this.operatingHoursRepository.findOperatingHoursByFacilityId(facilityId);
    if (operatingHours.length > 0) {
      return operatingHours.map(item => ({
        ...item,
        dayOfWeek: item.dayOfWeek as FacilityOperatingHourLike['dayOfWeek'],
        isClosed: Boolean(item.isClosed),
      }));
    }
    return buildDefaultOperatingHours();
  }

  private buildOperatingHoursFromGroupedInput(dto: UpdateFacilityOperatingHoursDto): FacilityOperatingHourLike[] {
    return buildOperatingHoursFromGroupedSchedules(dto.schedules);
  }

  private async ensureOperatingHoursCompatibleWithUpcomingShifts(
    facilityId: string,
    operatingHours: FacilityOperatingHourLike[],
  ): Promise<void> {
    const [impactedShifts, impactedShiftSlots] = await Promise.all([
      this.findOperatingHourImpactedShifts(facilityId, operatingHours),
      this.findOperatingHourImpactedShiftSlots(facilityId, operatingHours),
    ]);
    if (impactedShifts.length === 0 && impactedShiftSlots.length === 0) return;

    this.throwOperatingHoursImpactConflict(impactedShifts, impactedShiftSlots);
  }

  private throwOperatingHoursImpactConflict(
    impactedShifts: ImpactedShiftData[],
    impactedShiftSlots: ImpactedShiftSlotData[],
  ): never {
    throw new ConflictException({
      message: RESPONSE_MESSAGES.FACILITIES.OPERATING_HOURS_HAS_IMPACTED_SHIFTS,
      data: {
        duplicatedField: 'operatingHours',
        impactedShifts,
        impactedShiftSlots,
      },
    });
  }

  private async findOperatingHourImpactedShifts(
    facilityId: string,
    operatingHours: FacilityOperatingHourLike[],
  ): Promise<ImpactedShiftData[]> {
    const shifts = await this.operatingHoursRepository.findActiveShiftsForOperatingHourValidation(
      facilityId,
      todayInVietnam(),
    );
    return findImpactedShiftsByOperatingHours(shifts, operatingHours);
  }

  private async findOperatingHourImpactedShiftSlots(
    facilityId: string,
    operatingHours: FacilityOperatingHourLike[],
  ): Promise<ImpactedShiftSlotData[]> {
    const slots = await this.operatingHoursRepository.findActiveShiftSlotsForOperatingHourValidation(facilityId);
    return findImpactedShiftSlotsByOperatingHours(slots, operatingHours);
  }
}
