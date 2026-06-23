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
import { randomBytes, createHash } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RoleEnum } from '../../common/constants/role.enum';
import { IRolesService, ROLES_SERVICE } from '../roles/interfaces/roles-service.interface';
import { USERS_REPOSITORY, IUsersRepository } from '../users/interfaces/users-repository.interface';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/request/login.dto';
import { RegisterDto } from './dto/request/register.dto';
import { AuthResponseDto } from './dto/response/auth-response.dto';
import { ForgotPasswordResponseDto } from './dto/response/forgot-password-response.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshToken } from './entities/refresh-token.entity';

const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    @Inject(ROLES_SERVICE)
    private readonly rolesService: IRolesService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const userRole = await this.rolesService.findByName(RoleEnum.MEMBER);
    const saltRounds = this.configService.getOrThrow<number>('bcrypt.saltRounds');
    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: await bcrypt.hash(dto.password, saltRounds),
      roles: userRole ? [userRole] : [],
    });

    const savedUser = await this.usersRepository.save(user);
    return this.buildAuthResponse(savedUser);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findByEmailWithPassword(dto.email);

    if (!user || user.status !== 1) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponseDto> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user || user.status !== 1) {
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
    return {
      reset_token: resetToken,
      reset_url: `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`,
    };
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const tokenHash = this.hashResetToken(token);
    const storedToken = await this.passwordResetTokenRepository.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
      },
      relations: { user: { roles: true } },
    });

    if (
      !storedToken ||
      storedToken.expiresAt.getTime() <= Date.now() ||
      storedToken.user.status !== 1
    ) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const saltRounds = this.configService.getOrThrow<number>('bcrypt.saltRounds');
    storedToken.user.password = await bcrypt.hash(password, saltRounds);
    storedToken.usedAt = new Date();

    await this.usersRepository.save(storedToken.user);
    await this.passwordResetTokenRepository.save(storedToken);
    await this.refreshTokenRepository.update(
      { userId: storedToken.userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async me(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid user');
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
      relations: { user: { roles: { permissions: true } } },
    });

    if (
      !storedToken ||
      storedToken.expiresAt.getTime() <= Date.now() ||
      storedToken.user.status !== 1
    ) {
      throw new UnauthorizedException('Invalid refresh token');
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

  private async createAuthResponse(
    user: User,
    refreshToken: string,
    refreshTokenHash: string,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
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
