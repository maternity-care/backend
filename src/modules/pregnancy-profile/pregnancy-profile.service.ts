import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePregnancyProfileDto } from './dto/request/create-pregnancy-profile.dto';
import { UpdatePregnancyProfileDto } from './dto/request/update-pregnancy-profile.dto';
import { PregnancyProfile } from './entities/pregnancy-profiles.entity';
import {
  IPregnancyProfileRepository,
  PREGNANCY_PROFILE_REPOSITORY,
} from './interfaces/pregnancy-profile-repository.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { SearchProfileQueryDto } from './dto/request/search-pregnancy-profiles.dto';
import { RESPONSE_MESSAGES } from 'src/common/constants/response-message.constant';
import { IMailService, MAIL_SERVICE } from '../mail/interfaces/mail-service.interface';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationReferenceType,
  NotificationType,
} from 'src/common/constants/notification.enum';
import { RoleEnum } from 'src/common/constants/role.enum';

@Injectable()
export class PregnancyProfileService {
  constructor(
    @Inject(PREGNANCY_PROFILE_REPOSITORY)
    private readonly pregnancyProfileRepository: IPregnancyProfileRepository,
    @Inject(MAIL_SERVICE)
    private readonly mailService: IMailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    patientId: string,
    dto: CreatePregnancyProfileDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PregnancyProfile> {
    const existing = await this.pregnancyProfileRepository.checkActiveProfileExists(patientId);
    if (existing) {
      throw new ConflictException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.EXISTS);
    }

    if (!actor) {
      // admin hoặc user mới có thể tạo
      throw new NotFoundException(RESPONSE_MESSAGES.NOT_FOUND_CURRENT_USER);
    }

    if (dto.paraFullTerm + dto.paraPremature + dto.paraAbortion < dto.gravida) {
      throw new ConflictException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.PARA_CONFLICT);
    }

    const code = await this.pregnancyProfileRepository.generatePregnancyCode();

    const profile = this.pregnancyProfileRepository.create({
      patientId: patientId,
      code: code,
      lastMenstrualPeriod: dto.lastMenstrualPeriod,
      expectedDueDate: dto.expectedDueDate,
      fetalCount: dto.fetalCount ?? 1,
      gravida: dto.gravida,
      paraFullTerm: dto.paraFullTerm ?? 0,
      paraPremature: dto.paraPremature ?? 0,
      paraAbortion: dto.paraAbortion ?? 0,
      paraLivingChildren: dto.paraLivingChildren ?? 0,
      riskLevel: dto.riskLevel,
      status: dto.status,
      notes: dto.notes,
      createdBy: actor.id ?? patientId, // admin hoặc thai phụ tạo
    });

    return this.pregnancyProfileRepository.save(profile);
  }

  async findMyProfile(patientId: string): Promise<PregnancyProfile[]> {
    const profiles = await this.pregnancyProfileRepository.findByPatientId(patientId);
    return profiles.length > 0 ? profiles : [];
  }

  async findById(id: string): Promise<PregnancyProfile> {
    const profile = await this.pregnancyProfileRepository.findById(id);
    if (!profile) {
      throw new NotFoundException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_FOUND);
    }
    return profile;
  }

  async update(id: string, dto: UpdatePregnancyProfileDto): Promise<PregnancyProfile> {
    const profile = await this.findById(id);
    if (!profile) {
      throw new NotFoundException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_FOUND);
    }

    Object.assign(profile, dto);
    if (profile.paraFullTerm + profile.paraPremature + profile.paraAbortion < profile.gravida) {
      throw new ConflictException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.PARA_CONFLICT);
    }
    return this.pregnancyProfileRepository.save(profile);
  }

  async softDelete(userId: string, pregnancyId: string, reason: string): Promise<void> {
    await this.pregnancyProfileRepository.softDelete(userId, pregnancyId, reason);
  }

  async findByCode(code: string): Promise<PregnancyProfile> {
    const profile = await this.pregnancyProfileRepository.findByCode(code);
    if (!profile) {
      throw new NotFoundException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_FOUND);
    }
    return profile;
  }

  async findByPatientId(patientId: string): Promise<PregnancyProfile[]> {
    return this.pregnancyProfileRepository.findByPatientId(patientId);
  }

  async searchProfiles(
    query: SearchProfileQueryDto,
  ): Promise<{ data: PregnancyProfile[]; total: number }> {
    return this.pregnancyProfileRepository.searchProfiles(query);
  }

  async createRequestSoftDelete(
    user: AuthenticatedUser,
    pregnancyId: string,
    reason: string,
  ): Promise<void> {
    const isStaff = user.roles.some(
      (role) =>
        role.name === RoleEnum.DOCTOR ||
        role.name === RoleEnum.NURSE ||
        role.name === RoleEnum.STAFF,
    );
    if (!isStaff) {
      throw new ConflictException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_IS_STAFF);
    }
    const profile = await this.findById(pregnancyId);
    if (!profile) {
      throw new NotFoundException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_FOUND);
    }
    await this.mailService.sendSoftDeleteRequestEmail({
      to: profile.user.email,
      name: profile.user.name,
      doctorName: user.name,
      profileCode: profile.code,
      reason: reason,
      actionUrl: process.env.FRONTEND_URL,
    });
    await this.notificationsService.create({
      userId: profile.user.id,
      type: NotificationType.PREGNANCY_PROFILE,
      title: `Yêu cầu xóa hồ sơ thai kỳ`,
      content: `Bạn có một yêu cầu xóa hồ sơ thai kỳ có mã hồ sơ là ${profile.code} từ bác sĩ ${user.name}, có mã nhân viên là ${user.employeeCode}
      Lý do: ${reason}. Hãy xác nhận hoặc từ chối yêu cầu này.`,
      referenceType: NotificationReferenceType.PREGNANCY_PROFILE,
      referenceId: pregnancyId,
    });
    await this.pregnancyProfileRepository.update(pregnancyId, {
      deletedBy: user.id,
      deletedReason: reason,
    });
    return;
  }

  async confirmSoftDelete(
    userId: string,
    pregnancyId: string,
    confirmed: boolean,
  ): Promise<PregnancyProfile> {
    const profile = await this.findById(pregnancyId);
    if (!profile) {
      throw new NotFoundException(RESPONSE_MESSAGES.PREGNANCY_PROFILES.NOT_FOUND);
    }

    if (confirmed) {
      await this.pregnancyProfileRepository.softDelete(
        profile.deletedBy,
        pregnancyId,
        profile.deletedReason,
      );
      return profile;
    } else {
      await this.pregnancyProfileRepository.update(pregnancyId, {
        deletedBy: undefined,
        deletedReason: undefined,
        deletedAt: undefined,
      });
      return profile;
    }
  }
}
