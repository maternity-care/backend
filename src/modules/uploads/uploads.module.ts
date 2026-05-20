import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { STORAGE_SERVICE } from './interfaces/storage-service.interface';
import { ManagementUploadsController } from './management-uploads.controller';
import { S3StorageService } from './services/s3-storage.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [ConfigModule],
  controllers: [UploadsController, ManagementUploadsController],
  providers: [
    UploadsService,
    {
      provide: STORAGE_SERVICE,
      useClass: S3StorageService,
    },
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
