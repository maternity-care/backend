import { ObjectCannedACL } from '@aws-sdk/client-s3';

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface CreatePresignedUploadInput {
  key: string;
  mimeType: string;
  expiresIn: number;
  objectAcl?: ObjectCannedACL;
}

export interface CreatePresignedDownloadInput {
  key: string;
  expiresIn: number;
}

export interface PresignedUploadResult {
  key: string;
  url: string;
  downloadUrl: string;
  publicUrl: string;
  bucket: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresIn: number;
}

export interface IStorageService {
  createPresignedUpload(input: CreatePresignedUploadInput): Promise<PresignedUploadResult>;
  createPresignedDownload(input: CreatePresignedDownloadInput): Promise<string>;
  createPublicUrl(key: string): string;
}
