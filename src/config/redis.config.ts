export default () => ({
  redis: {
    host: process.env.REDIS_HOST ?? 'maternity-redis',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },
});
