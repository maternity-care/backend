export default () => ({
  storage: {
    driver: process.env.STORAGE_DRIVER ?? 's3',
    bucket: process.env.S3_BUCKET ?? '',
    region: process.env.S3_REGION ?? 'ap-southeast-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? '',
    cdnBaseUrl: process.env.CDN_BASE_URL || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    maxFileSizeMb: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? 10),
    presignExpiresIn: Number(process.env.UPLOAD_PRESIGN_EXPIRES_IN ?? 300),
    allowedMimeTypes: (
      process.env.UPLOAD_ALLOWED_MIME_TYPES ?? 'image/jpeg,image/png,image/webp,application/pdf'
    )
      .split(',')
      .map((mimeType) => mimeType.trim())
      .filter(Boolean),
  },
});
