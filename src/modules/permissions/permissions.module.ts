import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { UserPermission } from './entities/user-permission.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsRepository } from './repositories/permissions.repository';
import { PERMISSIONS_REPOSITORY } from './interfaces/permissions-repository.interface';
import { PERMISSIONS_SERVICE } from './interfaces/permissions-service.interface';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, UserPermission])],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    { provide: PERMISSIONS_SERVICE, useExisting: PermissionsService },
    { provide: PERMISSIONS_REPOSITORY, useClass: PermissionsRepository },
  ],
  exports: [PermissionsService, PERMISSIONS_SERVICE],
})
export class PermissionsModule {}
