export const REDIS_CACHE_SERVICE = Symbol('REDIS_CACHE_SERVICE');

export interface IRedisCacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  increment(key: string, ttlSeconds: number): Promise<number>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<void>;
}
