import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user || user.status !== 1) {
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
    };
  }
}
