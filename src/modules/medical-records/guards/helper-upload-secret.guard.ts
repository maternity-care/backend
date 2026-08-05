import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class HelperUploadSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = this.configService.get<string>('helper.uploadSecret');
    if (!expectedSecret) {
      throw new UnauthorizedException('Helper upload secret is not configured');
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, unknown> }>();
    const receivedSecret = String(request.headers['x-helper-secret'] ?? '');

    if (!this.matchesSecret(receivedSecret, expectedSecret)) {
      throw new UnauthorizedException('Helper upload secret is invalid');
    }

    return true;
  }

  private matchesSecret(receivedSecret: string, expectedSecret: string): boolean {
    const received = Buffer.from(receivedSecret);
    const expected = Buffer.from(expectedSecret);
    return received.length === expected.length && timingSafeEqual(received, expected);
  }
}
