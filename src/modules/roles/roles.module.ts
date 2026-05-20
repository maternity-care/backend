import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from '../permissions/permissions.module';
import { Role } from './entities/role.entity';
import { RolesController } from './roles.controller';
import { RolesRepository } from './repositories/roles.repository';
import { ROLES_REPOSITORY } from './interfaces/roles-repository.interface';
import { ROLES_SERVICE } from './interfaces/roles-service.interface';
import { RolesService } from './roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role]), PermissionsModule],
  controllers: [RolesController],
  providers: [
    RolesService,
    { provide: ROLES_SERVICE, useExisting: RolesService },
    { provide: ROLES_REPOSITORY, useClass: RolesRepository },
  ],
  exports: [RolesService, ROLES_SERVICE],
})
export class RolesModule {}
