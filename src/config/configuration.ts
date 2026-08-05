import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import mailConfig from './mail.config';
import redisConfig from './redis.config';
import storageConfig from './storage.config';

export default () => ({
  ...appConfig(),
  ...databaseConfig(),
  ...jwtConfig(),
  ...mailConfig(),
  ...redisConfig(),
  ...storageConfig(),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
  },
  helper: {
    uploadSecret: process.env.HELPER_UPLOAD_SECRET,
  },
  bcrypt: {
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  },
});
