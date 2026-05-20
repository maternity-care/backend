import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { REDIS_CACHE_SERVICE } from './redis-cache.interface';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RedisCacheService,
    {
      provide: REDIS_CACHE_SERVICE,
      useExisting: RedisCacheService,
    },
  ],
  exports: [RedisCacheService, REDIS_CACHE_SERVICE],
})
export class RedisCacheModule {}
