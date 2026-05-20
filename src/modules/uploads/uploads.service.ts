import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname, basename } from 'path';
import { randomBytes } from 'crypto';
import {
  CreateManagementPresignedUploadDto,
  CreatePresignedUploadDto,
} from './dto/create-presigned-upload.dto';
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
  ) {}

  createUserPresignedUpload(
    userId: string,
    dto: CreatePresignedUploadDto,
  ): Promise<PresignedUploadResult> {
    this.validateFileMetadata(dto.mimeType, dto.size);
    const key = `${userId}/${this.buildSluggedFileName(dto.fileName)}`;
    return this.createPresignedUpload(key, dto.mimeType);
  }

  createManagementPresignedUpload(
    dto: CreateManagementPresignedUploadDto,
  ): Promise<PresignedUploadResult> {
    this.validateFileMetadata(dto.mimeType, dto.size);
    const path = this.sanitizePath(dto.path);
    const fileName = this.buildSluggedFileName(dto.baseName ?? dto.fileName, dto.fileName);
    const key = `${path}/${fileName}`;
    return this.createPresignedUpload(key, dto.mimeType);
  }

  private createPresignedUpload(key: string, mimeType: string): Promise<PresignedUploadResult> {
    const expiresIn = this.configService.getOrThrow<number>('storage.presignExpiresIn');
    return this.storageService.createPresignedUpload({
      key,
      mimeType,
      expiresIn,
    });
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
