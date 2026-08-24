import { Staff } from './../staffs/entities/staff.entity';
import {
  IRedisCacheService,
  REDIS_CACHE_SERVICE,
} from './../../common/cache/redis-cache.interface';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash, randomInt } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { USERS_REPOSITORY, IUsersRepository } from '../users/interfaces/users-repository.interface';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/request/login.dto';
import { RegisterDto } from './dto/request/register.dto';
import { AuthResponseDto } from './dto/response/auth-response.dto';
import { ForgotPasswordResponseDto } from './dto/response/forgot-password-response.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshToken } from './entities/refresh-token.entity';
import {
  IStaffProfileRepository,
  STAFF_PROFILE_REPOSITORY,
} from '../staffs/interfaces/staff-profile-repository.interface';
import { StaffRefreshToken } from './entities/staff-refresh-token.entity';
import { StaffPasswordResetToken } from './entities/staff-password-reset-token.entity';
import { AccountStatus } from '../../common/constants/status.enum';
import { UpdateManagementProfileDto } from './dto/request/update-management-profile.dto';
import { ChangeManagementPasswordDto } from './dto/request/change-management-password.dto';
import { ChangePasswordDto } from './dto/request/change-password.dto';
import {
  IUserAuthRepository,
  USER_AUTH_REPOSITORY,
} from './interfaces/user-auth-repository.interface';
import { JobsService } from '../jobs/jobs.service';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';

const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;
const OTP_TTL = 15;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly jobsService: JobsService,
    @Inject(STAFF_PROFILE_REPOSITORY)
    private readonly staffRepository: IStaffProfileRepository,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(StaffRefreshToken)
    private readonly staffRefreshTokenRepository: Repository<StaffRefreshToken>,
    @InjectRepository(StaffPasswordResetToken)
    private readonly staffPasswordResetTokenRepository: Repository<StaffPasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(USER_AUTH_REPOSITORY)
    private readonly userAuthRepository: IUserAuthRepository,
    @Inject(REDIS_CACHE_SERVICE)
    private readonly cacheService: IRedisCacheService,
  ) {}

  async createUserAuth(userId: string, email: string, password: string) {
    const saltRounds = this.configService.getOrThrow<number>('bcrypt.saltRounds');
    const userAuth = await this.userAuthRepository.create({
      userId,
      email,
      password: await bcrypt.hash(password, saltRounds),
    });
    const savedUserAuth = await this.userAuthRepository.save(userAuth);

    return savedUserAuth;
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    // Validate email trước rồi mới làm tiếp
    const otp = randomInt(0, 1000000).toString().padStart(6, '0');
    const otpCacheKey = `verifyOtp:${dto.email}`;
    const registerCacheKey = `register:${dto.email}`;
    await this.cacheService.set(otpCacheKey, otp, OTP_TTL * 60 + 60);
    await this.cacheService.set(registerCacheKey, dto, OTP_TTL * 3 * 60);
    await this.jobsService.enqueueOtpEmail({
      to: dto.email,
      name: dto.name,
      otp,
      expiresInMinutes: OTP_TTL,
    });
    return {
      message: RESPONSE_MESSAGES.AUTH_VERIFY_EMAIL_SENT,
    };
  }

  async resendOtpEmail(email: string): Promise<{ message: string }> {
    const searchInCache = (await this.cacheService.get(`register:${email}`)) as
      | RegisterDto
      | undefined;
    if (!searchInCache) {
      return {
        message: RESPONSE_MESSAGES.AUTH_EMAIL_NOT_FOUND,
      };
    }
    const otp = randomInt(0, 1000000).toString().padStart(6, '0');
    const cacheKey = `verifyOtp:${email}`;
    await this.cacheService.set(cacheKey, otp, OTP_TTL * 60 + 60);
    await this.jobsService.enqueueOtpEmail({
      to: email,
      name: searchInCache.name,
      otp,
      expiresInMinutes: OTP_TTL,
    });
    return {
      message: RESPONSE_MESSAGES.AUTH_VERIFY_EMAIL_SENT,
    };
  }

  async verifyOTP(email: string, otp: string): Promise<AuthResponseDto> {
    const otpCacheKey = `verifyOtp:${email}`;
    const cacheOtp = await this.cacheService.get(otpCacheKey);
    if (!cacheOtp) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH_OTP_NOT_FOUND);
    }
    if (cacheOtp !== otp) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH_OTP_INVALID);
    }
    const registerCacheKey = `register:${email}`;
    const cacheDto = (await this.cacheService.get(registerCacheKey)) as RegisterDto | undefined;

    if (!cacheDto) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH_REGISTER_NOT_FOUND);
    }

    // xác thực otp thành công, bắt đầu tạo tài khoản
    // tạo user, tạo user auth

    const existing = await this.usersRepository.findByEmail(
      cacheDto.email.toString().toLowerCase(),
    );
    if (existing) {
      // nếu đã có email tức là đã tạo user
      // thì chỉ cần check xem đã có accout hay chưa
      // để tạo user account cho người dùng là được
      if (existing.status === AccountStatus.ACTIVE) {
        const userAuth = await this.userAuthRepository.findByEmail(
          cacheDto.email.toString().toLowerCase(),
        );
        if (userAuth) {
          throw new ConflictException(RESPONSE_MESSAGES.AUTH_EMAIL_EXISTS);
        }
        const savedUser = await this.createUserAuth(
          existing.id,
          cacheDto.email.toString().toLowerCase(),
          cacheDto.password,
        );
        return this.buildAuthResponse(savedUser.user);
      }
    }

    const user = this.usersRepository.create({
      name: cacheDto.name,
      email: cacheDto.email.toString().toLowerCase(),
      phone: cacheDto.phone,
    });

    const savedUser = await this.usersRepository.save(user);
    await this.createUserAuth(
      savedUser.id,
      cacheDto.email.toString().toLowerCase(),
      cacheDto.password,
    );

    await this.cacheService.del(otpCacheKey);
    await this.cacheService.del(registerCacheKey);
    return this.buildAuthResponse(savedUser);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userAuthRepository.findByEmail(dto.email.toString().toLowerCase());

    if (!user) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_INVALID_CREDENTIALS);
    }
    if (user.status !== AccountStatus.ACTIVE || user.user?.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_USER_INACTIVE);
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_INVALID_CREDENTIALS);
    }

    return this.buildAuthResponse(user.user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const userAuth = await this.userAuthRepository.findByUserId(userId);
    if (
      !userAuth ||
      userAuth.status !== AccountStatus.ACTIVE ||
      userAuth.user?.status !== AccountStatus.ACTIVE
    ) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_USER_INACTIVE);
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, userAuth.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH_CURRENT_PASSWORD_INVALID);
    }
    if (await bcrypt.compare(dto.newPassword, userAuth.password)) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH_NEW_PASSWORD_SAME);
    }

    userAuth.password = await bcrypt.hash(
      dto.newPassword,
      this.configService.getOrThrow<number>('bcrypt.saltRounds'),
    );
    await this.userAuthRepository.save(userAuth);
    await this.refreshTokenRepository.update(
      { userId: userAuth.userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async managementLogin(dto: LoginDto): Promise<AuthResponseDto> {
    const staff = await this.staffRepository.findByEmail(dto.email);
    if (!staff) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_INVALID_CREDENTIALS);
    }
    if (staff.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_STAFF_INACTIVE);
    }
    if (!staff.password) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_PASSWORD_LOGIN_NOT_CONFIGURED);
    }
    const isValidPassword = await bcrypt.compare(dto.password, staff.password);
    if (!isValidPassword) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_INVALID_CREDENTIALS);
    }

    return this.createStaffAuthResponse(staff);
  }

  async updateManagementProfile(
    staffId: string,
    dto: UpdateManagementProfileDto,
  ): Promise<Record<string, unknown>> {
    const staff = await this.staffRepository.updateStaffProfile(staffId, dto);
    if (!staff) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_STAFF_INACTIVE);
    }
    const { password: _password, ...safeStaff } = staff;
    return safeStaff;
  }

  async changeManagementPassword(email: string, dto: ChangeManagementPasswordDto): Promise<void> {
    const staff = await this.staffRepository.findByEmailWithPassword(email);
    if (!staff) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_STAFF_INACTIVE);
    }
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, staff.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH_CURRENT_PASSWORD_INVALID);
    }
    if (await bcrypt.compare(dto.newPassword, staff.password)) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH_NEW_PASSWORD_SAME);
    }
    staff.password = await bcrypt.hash(
      dto.newPassword,
      this.configService.getOrThrow<number>('bcrypt.saltRounds'),
    );
    await this.staffRepository.save(staff);
    await this.staffRefreshTokenRepository.update(
      { staffId: staff.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async managementForgotPassword(email: string): Promise<ForgotPasswordResponseDto> {
    const staff = await this.staffRepository.findByEmail(email);
    if (!staff || staff.status !== AccountStatus.ACTIVE) {
      return { reset_token: null, reset_url: null };
    }
    await this.staffPasswordResetTokenRepository.update(
      { staffId: staff.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    const resetToken = this.generateResetToken();
    await this.staffPasswordResetTokenRepository.save(
      this.staffPasswordResetTokenRepository.create({
        staffId: staff.id,
        tokenHash: this.hashResetToken(resetToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
        usedAt: null,
      }),
    );
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/management/reset-password?token=${resetToken}`;
    await this.jobsService.enqueuePasswordResetEmail({
      to: staff.email,
      name: staff.name,
      resetUrl,
      expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MINUTES,
    });
    return { reset_token: resetToken, reset_url: resetUrl };
  }

  async managementResetPassword(token: string, password: string): Promise<void> {
    const storedToken = await this.staffPasswordResetTokenRepository.findOne({
      where: { tokenHash: this.hashResetToken(token), usedAt: IsNull() },
    });
    if (!storedToken || storedToken.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH_PASSWORD_RESET_TOKEN_INVALID);
    }
    const staff = await this.staffRepository.findById(storedToken.staffId);
    if (!staff || staff.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH_STAFF_INACTIVE);
    }
    staff.password = await bcrypt.hash(
      password,
      this.configService.getOrThrow<number>('bcrypt.saltRounds'),
    );
    storedToken.usedAt = new Date();
    await this.staffRepository.save(staff);
    await this.staffPasswordResetTokenRepository.save(storedToken);
    await this.staffRefreshTokenRepository.update(
      { staffId: staff.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async managementRefresh(refreshToken: string): Promise<AuthResponseDto> {
    const storedToken = await this.staffRefreshTokenRepository.findOne({
      where: { tokenHash: this.hashRefreshToken(refreshToken), revokedAt: IsNull() },
    });
    if (!storedToken || storedToken.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_REFRESH_TOKEN_INVALID);
    }
    const staff = await this.staffRepository.findById(storedToken.staffId);
    if (!staff || staff.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_STAFF_INACTIVE);
    }
    storedToken.revokedAt = new Date();
    await this.staffRefreshTokenRepository.save(storedToken);
    return this.createStaffAuthResponse(staff);
  }

  async managementLogout(refreshToken: string): Promise<void> {
    await this.staffRefreshTokenRepository.update(
      { tokenHash: this.hashRefreshToken(refreshToken), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponseDto> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user || user.status !== AccountStatus.ACTIVE) {
      return { reset_token: null, reset_url: null };
    }

    await this.passwordResetTokenRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const resetToken = this.generateResetToken();
    const tokenHash = this.hashResetToken(resetToken);
    await this.passwordResetTokenRepository.save(
      this.passwordResetTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
        usedAt: null,
      }),
    );

    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;

    await this.jobsService.enqueuePasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MINUTES,
    });

    return {
      reset_token: resetToken,
      reset_url: resetUrl,
    };
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const tokenHash = this.hashResetToken(token);
    const storedToken = await this.passwordResetTokenRepository.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
      },
      relations: { user: true },
    });

    if (
      !storedToken ||
      storedToken.expiresAt.getTime() <= Date.now() ||
      storedToken.user.status !== AccountStatus.ACTIVE
    ) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH_PASSWORD_RESET_TOKEN_INVALID);
    }

    const userAuth = await this.userAuthRepository.findByUserId(storedToken.userId);
    if (!userAuth || userAuth.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH_USER_INACTIVE);
    }
    userAuth.password = await bcrypt.hash(
      password,
      this.configService.getOrThrow<number>('bcrypt.saltRounds'),
    );
    storedToken.usedAt = new Date();

    await this.userAuthRepository.save(userAuth);
    await this.passwordResetTokenRepository.save(storedToken);
    await this.refreshTokenRepository.update(
      { userId: storedToken.userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async me(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_USER_INVALID);
    }

    return user;
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
      },
      relations: { user: true },
    });

    if (
      !storedToken ||
      storedToken.expiresAt.getTime() <= Date.now() ||
      storedToken.user.status !== AccountStatus.ACTIVE
    ) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH_REFRESH_TOKEN_INVALID);
    }

    const newRefreshToken = this.generateRefreshToken();
    const newRefreshTokenHash = this.hashRefreshToken(newRefreshToken);
    storedToken.revokedAt = new Date();
    storedToken.replacedByTokenHash = newRefreshTokenHash;
    await this.refreshTokenRepository.save(storedToken);

    return this.createAuthResponse(storedToken.user, newRefreshToken, newRefreshTokenHash);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
      },
    });

    if (storedToken) {
      storedToken.revokedAt = new Date();
      await this.refreshTokenRepository.save(storedToken);
    }
  }

  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    return this.createAuthResponse(user, refreshToken, refreshTokenHash);
  }

  private async createStaffAuthResponse(staff: Staff): Promise<AuthResponseDto> {
    const refreshToken = this.generateRefreshToken();
    const payload: JwtPayload = {
      sub: staff.id,
      email: staff.email,
      accountType: 'staff',
    };
    await this.staffRefreshTokenRepository.save(
      this.staffRefreshTokenRepository.create({
        staffId: staff.id,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: this.getRefreshTokenExpiresAt(),
        revokedAt: null,
        replacedByTokenHash: null,
      }),
    );
    const { password: _password, ...safeStaff } = staff;
    return {
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: refreshToken,
      user: safeStaff,
    };
  }

  private async createAuthResponse(
    user: User,
    refreshToken: string,
    refreshTokenHash: string,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      accountType: 'user',
    };
    const accessToken = await this.jwtService.signAsync(payload);
    const freshUser = await this.usersRepository.findById(user.id);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: this.getRefreshTokenExpiresAt(),
        revokedAt: null,
        replacedByTokenHash: null,
      }),
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: freshUser ?? user,
    };
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private hashResetToken(resetToken: string): string {
    return createHash('sha256').update(resetToken).digest('hex');
  }

  private getRefreshTokenExpiresAt(): Date {
    const expiresIn = this.configService.getOrThrow<string>('jwt.refreshExpiresIn');
    return new Date(Date.now() + this.parseDurationToMilliseconds(expiresIn));
  }

  private parseDurationToMilliseconds(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new Error('JWT_REFRESH_EXPIRES_IN must use s, m, h, or d suffix');
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * multipliers[unit];
  }
}
