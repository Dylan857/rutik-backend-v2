import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim()),
  parentsAppUrl: process.env.PARENTS_APP_URL ?? 'http://localhost:4201',
}));
