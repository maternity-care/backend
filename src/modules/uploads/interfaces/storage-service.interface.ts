export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface CreatePresignedUploadInput {
  key: string;
  mimeType: string;
  expiresIn: number;
}

export interface PresignedUploadResult {
  key: string;
  url: string;
  publicUrl: string;
  bucket: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresIn: number;
}

export interface IStorageService {
  createPresignedUpload(input: CreatePresignedUploadInput): Promise<PresignedUploadResult>;
}
