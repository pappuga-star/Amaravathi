import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongodbUri:
    process.env.MONGODB_URI ?? '',   // validated at startup in connectDatabase()
  jwtSecret: process.env.JWT_SECRET ?? 'local-development-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  corsOrigin: (
    process.env.CORS_ORIGIN ??
    'http://localhost:5173,http://localhost:5174,http://localhost:5175'
  )
    .split(',')
    .map((origin) => origin.trim()),
};
