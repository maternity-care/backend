import { Staff } from './../../staffs/entities/staff.entity';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { Facility } from '../../facilities/entities/facility.entity';
import { AccountStatus } from '../../../common/constants/status.enum';
import { RoleEnum } from '../../../common/constants/role.enum';
import { RESPONSE_MESSAGES } from '../../../common/constants/response-message.constant';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(Staff)
    private readonly staffProfileRepository: Repository<Staff>,
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
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_USER_INACTIVE);
    }

    return {
      ...user,
      id: user.id,
      name: user.name,
      email: user.email,
      roles: [],
      status: user.status,
      permissionOverrides: [],
      facilities: [],
      facilityRole: null,
      facilityRoles: [],
      activeFacilityId: null,
    };
  }

  private async validateStaff(request: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    const staff = await this.staffProfileRepository.findOne({
      where: { id: payload.sub, status: AccountStatus.ACTIVE },
      relations: {
        roles: { permissions: true },
        permissions: { permission: true },
        doctor: true,
        facility: true,
      },
    });

    if (!staff) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_STAFF_INACTIVE);
    }

    const roles = staff.roles.map((role) => ({
      id: role.id,
      name: role.name,
      permissions: role.permissions.map((permission) => permission),
    }));
    const isSuperAdmin = roles.some((role) => role.name === RoleEnum.SUPER_ADMIN);
    const facilities =
      staff.facility && !isSuperAdmin
        ? [
            {
              id: staff.facility.id,
              name: staff.facility.name,
              code: staff.facility.code,
              status: staff.facility.status,
              role: roles[0],
              roles,
            },
          ]
        : [];

    return {
      id: staff.id,
      doctor: staff.doctor
        ? {
            id: staff.doctor.id,
            specialty: staff.doctor.specialty,
            title: staff.doctor.title,
          }
        : null,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      personalEmail: staff.personalEmail,
      employeeCode: staff.employeeCode,
      status: staff.status,
      roles,
      permissionOverrides: (staff.permissions ?? []).map((override) => ({
        permission: override.permission,
        effect: override.effect,
      })),
      facilities,
      facilityRole: null,
      facilityRoles: [],
      activeFacilityId: isSuperAdmin ? null : staff.facilityId,
    };
  }
}
