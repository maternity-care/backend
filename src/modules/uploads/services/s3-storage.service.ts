import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  CreatePresignedUploadInput,
  IStorageService,
  PresignedUploadResult,
} from '../interfaces/storage-service.interface';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new S3Client({
      region: this.configService.getOrThrow<string>('storage.region'),
      endpoint: this.configService.get<string>('storage.endpoint'),
      forcePathStyle: this.configService.get<boolean>('storage.forcePathStyle') ?? false,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('storage.accessKeyId'),
        secretAccessKey: this.configService.getOrThrow<string>('storage.secretAccessKey'),
      },
    });
  }

  async createPresignedUpload(input: CreatePresignedUploadInput): Promise<PresignedUploadResult> {
    const bucket = this.configService.getOrThrow<string>('storage.bucket');

    if (!bucket) {
      throw new BadRequestException('S3 bucket is not configured');
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      ContentType: input.mimeType,
      ACL: input.objectAcl,
    });
    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresIn,
    });
    const downloadUrl = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: input.key,
      }),
      {
        expiresIn: this.configService.get<number>('storage.downloadExpiresIn') ?? 3600,
      },
    );

    return {
      key: input.key,
      url: signedUrl,
      downloadUrl,
      publicUrl: this.buildPublicUrl(bucket, input.key),
      bucket,
      method: 'PUT',
      headers: {
        'Content-Type': input.mimeType,
      },
      expiresIn: input.expiresIn,
    };
  }

  async createPresignedDownload(input: { key: string; expiresIn: number }): Promise<string> {
    const bucket = this.configService.getOrThrow<string>('storage.bucket');
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: input.key,
      }),
      { expiresIn: input.expiresIn },
    );
  }

  createPublicUrl(key: string): string {
    const bucket = this.configService.getOrThrow<string>('storage.bucket');
    return this.buildPublicUrl(bucket, key);
  }

  private buildPublicUrl(bucket: string, key: string): string {
    const cdnBaseUrl = this.configService.get<string>('storage.cdnBaseUrl');

    if (cdnBaseUrl) {
      return `${cdnBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    const endpoint = this.configService.get<string>('storage.endpoint');
    if (endpoint) {
      return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
    }

    const region = this.configService.getOrThrow<string>('storage.region');
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
