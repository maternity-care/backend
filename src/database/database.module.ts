import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { User } from '../modules/users/entities/user.entity';
import { Role } from '../modules/roles/entities/role.entity';
import { Permission } from '../modules/permissions/entities/permission.entity';
import { UserPermission } from '../modules/permissions/entities/user-permission.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mariadb',
        host: configService.getOrThrow<string>('database.host'),
        port: configService.getOrThrow<number>('database.port'),
        username: configService.getOrThrow<string>('database.username'),
        password: configService.getOrThrow<string>('database.password'),
        database: configService.getOrThrow<string>('database.name'),
        synchronize: false,
        migrationsRun: false,
        logging: configService.get<string>('app.nodeEnv') === 'development',
        entities: [
          User,
          Role,
          Permission,
          UserPermission,
          RefreshToken,
          join(__dirname, 'entities', '*.entity{.ts,.js}'),
        ],
        autoLoadEntities: true,
        charset: 'utf8mb4_unicode_ci',
      }),
    }),
  ],
})
export class DatabaseModule {}
