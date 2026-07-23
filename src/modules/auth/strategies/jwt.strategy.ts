import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { RoleEnum } from '../../../common/constants/role.enum';
import { StaffProfile } from '../../staffs/entities/staff.entity';
import { FacilityStaff } from '../../facilities/entities/facility-staff.entity';
import { Facility } from '../../facilities/entities/facility.entity';
import {
  AccountStatus,
  ActiveStatus,
  FacilityStatus,
} from '../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../common/constants/response-message.constant';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(StaffProfile)
    private readonly staffProfileRepository: Repository<StaffProfile>,
    @InjectRepository(FacilityStaff)
    private readonly facilityStaffRepository: Repository<FacilityStaff>,
    @InjectRepository(Facility)
    private readonly facilityRepository: Repository<Facility>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.accountType === 'staff') {
      return this.validateStaff(request, payload);
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid or inactive user');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      roles: (user.roles ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        permissions: (role.permissions ?? []).map((permission) => ({
          id: permission.id,
          name: permission.name,
        })),
      })),
      permissionOverrides: (user.permissionOverrides ?? []).map((permissionOverride) => ({
        effect: permissionOverride.effect,
        permission: {
          id: permissionOverride.permission.id,
          name: permissionOverride.permission.name,
        },
      })),
      facilities: [],
      facilityRole: null,
      facilityRoles: [],
      activeFacilityId: null,
    };
  }

  private async validateStaff(
    request: Request,
    payload: JwtPayload,
  ): Promise<AuthenticatedUser> {
    const staff = await this.staffProfileRepository.findOne({
      where: { id: payload.sub, status: AccountStatus.ACTIVE },
      relations: { roles: { permissions: true } },
    });
    if (!staff || staff.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid or inactive staff');
    }

    const isSuperAdmin = staff.roles?.some(
      (role) => role.name === RoleEnum.SUPER_ADMIN,
    );
    const assignments = await this.facilityStaffRepository.find({
      where: { staffId: staff.id, status: ActiveStatus.ACTIVE },
      relations: { role: { permissions: true } },
    });
    const facilities = await this.facilityRepository.find({
      where: {
        id: In(assignments.map((item) => item.facilityId)),
        status: FacilityStatus.ACTIVE,
      },
      select: { id: true, name: true, code: true, status: true },
      order: { name: 'ASC' },
    });
    const assignmentsByFacility = assignments.reduce<
      Map<string, FacilityStaff[]>
    >((result, assignment) => {
      const facilityId = String(assignment.facilityId);
      result.set(facilityId, [
        ...(result.get(facilityId) ?? []),
        assignment,
      ]);
      return result;
    }, new Map());

    const mappedFacilities = facilities.map((facility) => {
      const facilityAssignments =
        assignmentsByFacility.get(String(facility.id)) ?? [];
      const roles = facilityAssignments.map((assignment) => ({
        id: assignment.role.id,
        name: assignment.role.name,
        permissions: (assignment.role.permissions ?? []).map((permission) => ({
          id: permission.id,
          name: permission.name,
        })),
      }));
      return {
        id: facility.id,
        name: facility.name,
        code: facility.code,
        status: facility.status,
        role: roles[0],
        roles,
      };
    });
    const requestedFacilityId = request.header('x-facility-id') ?? null;
    const activeFacility =
      mappedFacilities.find(
        (facility) => String(facility.id) === String(requestedFacilityId),
      ) ?? null;
    const isBootstrapRequest = request.path.endsWith('/auth/me');

    if (
      !isSuperAdmin &&
      mappedFacilities.length > 0 &&
      !requestedFacilityId &&
      !isBootstrapRequest
    ) {
      throw new ForbiddenException(
        RESPONSE_MESSAGES.FACILITY_SELECTION_REQUIRED,
      );
    }
    if (
      !isSuperAdmin &&
      requestedFacilityId &&
      !activeFacility &&
      !isBootstrapRequest
    ) {
      throw new ForbiddenException(RESPONSE_MESSAGES.FACILITY_NOT_ASSIGNED);
    }

    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      personalEmail: staff.personalEmail,
      employeeCode: staff.employeeCode,
      status: staff.status,
      roles: (staff.roles ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        permissions: (role.permissions ?? []).map(({ id, name }) => ({ id, name })),
      })),
      permissionOverrides: [],
      facilities: mappedFacilities,
      facilityRole: activeFacility?.role ?? null,
      facilityRoles: activeFacility?.roles ?? [],
      activeFacilityId: isSuperAdmin ? null : requestedFacilityId,
    };
  }
}
