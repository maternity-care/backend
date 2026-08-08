import {
  CanActivate,
  ExecutionContext,
  Injectable,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class SepaySignatureGuard implements CanActivate {
  private readonly timestampToleranceSeconds = 5 * 60;

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();

    const signature = request.headers['x-sepay-signature'];
    const timestamp = request.headers['x-sepay-timestamp'];

    if (typeof signature !== 'string' || typeof timestamp !== 'string') {
      throw new UnauthorizedException('Missing SePay signature headers');
    }

    this.validateTimestamp(timestamp);

    const secret = this.configService.getOrThrow<string>('sepay.secret');

    if (!request.rawBody) {
      throw new UnauthorizedException('Webhook raw body is unavailable');
    }

    const rawBody = request.rawBody.toString('utf8');
    const signedPayload = `${timestamp}.${rawBody}`;

    const expectedSignature =
      'sha256=' + createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');

    if (!this.isSignatureValid(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid SePay signature');
    }

    return true;
  }

  private validateTimestamp(timestamp: string): void {
    if (!/^\d+$/.test(timestamp)) {
      throw new UnauthorizedException('Invalid SePay timestamp');
    }

    const webhookTimestamp = Number(timestamp);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const difference = Math.abs(currentTimestamp - webhookTimestamp);

    if (!Number.isSafeInteger(webhookTimestamp) || difference > this.timestampToleranceSeconds) {
      throw new UnauthorizedException('Expired SePay webhook');
    }
  }

  private isSignatureValid(signature: string, expectedSignature: string): boolean {
    const receivedBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  }
}
