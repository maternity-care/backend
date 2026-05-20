import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { IRedisCacheService } from './redis-cache.interface';

@Injectable()
export class RedisCacheService implements IRedisCacheService, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.getOrThrow<string>('redis.host'),
      port: this.configService.getOrThrow<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      keyPrefix: 'maternity-api:',
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error: Error) => {
      this.logger.error(`Redis cache error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    const stream = this.redis.scanStream({ match: pattern, count: 100 });

    for await (const keys of stream) {
      const cacheKeys = keys as string[];
      if (cacheKeys.length > 0) {
        await this.redis.del(...cacheKeys);
      }
    }
  }
}
