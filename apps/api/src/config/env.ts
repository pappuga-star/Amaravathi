import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: process.env.MONGODB_URI ?? '', // validated at startup in connectDatabase()
  jwtSecret: process.env.JWT_SECRET ?? 'local-development-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  allowedOrigins: (
    process.env.ALLOWED_ORIGINS ??
    process.env.FRONTEND_URL ??
    process.env.CORS_ORIGIN ??
    'http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
