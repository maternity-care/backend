import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import redisConfig from './redis.config';

export default () => ({
  ...appConfig(),
  ...databaseConfig(),
  ...jwtConfig(),
  ...redisConfig(),
  bcrypt: {
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  },
});
