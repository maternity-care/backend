import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

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
          join(__dirname, 'entities', '*.entity{.ts,.js}'),
          join(__dirname, '..', 'modules', '**', 'entities', '*.entity{.ts,.js}'),
        ],
        autoLoadEntities: true,
        charset: 'utf8mb4_unicode_ci',
      }),
    }),
  ],
})
export class DatabaseModule {}
