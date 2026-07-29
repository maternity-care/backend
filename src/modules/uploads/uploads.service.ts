import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectCannedACL } from '@aws-sdk/client-s3';
import { extname, basename } from 'path';
import { randomBytes } from 'crypto';
import { IRedisCacheService, REDIS_CACHE_SERVICE } from '../../common/cache/redis-cache.interface';
import {
  CreateManagementPresignedUploadDto,
  CreatePresignedUploadDto,
} from './dto/request/create-presigned-upload.dto';
import {
  IStorageService,
  PresignedUploadResult,
  STORAGE_SERVICE,
} from './interfaces/storage-service.interface';

@Injectable()
export class UploadsService {
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CACHE_SERVICE)
    private readonly cacheService: IRedisCacheService,
  ) {}

  async createUserPresignedUpload(
    userId: string,
    dto: CreatePresignedUploadDto,
  ): Promise<PresignedUploadResult> {
    this.validateFileMetadata(dto.mimeType, dto.size);
    await this.assertUploadRateLimit(`user:${userId}`, 'storage.userRateLimit');
    const key = `${userId}/${this.buildSluggedFileName(dto.fileName)}`;
    return this.createPresignedUpload(key, dto.mimeType);
  }

  async createManagementPresignedUpload(
    dto: CreateManagementPresignedUploadDto,
    actorId?: string,
  ): Promise<PresignedUploadResult> {
    this.validateFileMetadata(dto.mimeType, dto.size);
    await this.assertUploadRateLimit(
      `management:${actorId || 'unknown'}`,
      'storage.managementRateLimit',
    );
    const path = this.sanitizePath(dto.path);
    const fileName = this.buildSluggedFileName(dto.baseName ?? dto.fileName, dto.fileName);
    const key = `${path}/${fileName}`;
    return this.createPresignedUpload(key, dto.mimeType);
  }

  createPresignedDownload(key: string): Promise<string> {
    const expiresIn = this.configService.get<number>('storage.downloadExpiresIn') ?? 3600;
    return this.storageService.createPresignedDownload({ key, expiresIn });
  }

  createPublicUrl(key: string): string {
    return this.storageService.createPublicUrl(key);
  }

  private createPresignedUpload(key: string, mimeType: string): Promise<PresignedUploadResult> {
    const expiresIn = this.configService.getOrThrow<number>('storage.presignExpiresIn');
    return this.storageService.createPresignedUpload({
      key,
      mimeType,
      expiresIn,
      objectAcl: (this.configService.get<string>('storage.objectAcl') || undefined) as
        | ObjectCannedACL
        | undefined,
    });
  }

  private async assertUploadRateLimit(scopeKey: string, limitConfigKey: string): Promise<void> {
    const limit = this.configService.get<number>(limitConfigKey) ?? 20;
    const windowSeconds = this.configService.get<number>('storage.rateLimitWindowSeconds') ?? 600;
    const redisKey = `upload:presign:${scopeKey}`;
    const count = await this.cacheService.increment(redisKey, windowSeconds);

    if (count > limit) {
      throw new HttpException(
        `Bạn upload quá nhanh. Vui lòng thử lại sau ít phút.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private validateFileMetadata(mimeType: string, size: number): void {
    const allowedMimeTypes = this.configService.getOrThrow<string[]>('storage.allowedMimeTypes');
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`File type "${mimeType}" is not allowed`);
    }

    const maxFileSizeMb = this.configService.getOrThrow<number>('storage.maxFileSizeMb');
    const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

    if (size > maxFileSizeBytes) {
      throw new BadRequestException(`File size must be less than or equal to ${maxFileSizeMb}MB`);
    }
  }

  private buildSluggedFileName(name: string, extensionSource = name): string {
    const extension = extname(extensionSource).toLowerCase();
    const rawBaseName = basename(name, extname(name));
    const slug = this.slugify(rawBaseName || 'file') || 'file';
    return `${slug}_${this.randomString(10)}${extension}`;
  }

  private sanitizePath(path: string): string {
    const sanitizedPath = path
      .split('/')
      .map((segment) => this.slugify(segment))
      .filter(Boolean)
      .join('/');

    if (!sanitizedPath) {
      throw new BadRequestException('Upload path is invalid');
    }

    return sanitizedPath;
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private randomString(length: number): string {
    return randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }
}
