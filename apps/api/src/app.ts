import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

export function createApp() {
  const app = express();
  app.use(compression());
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Amaravathi Tea Pricing API is running',
      status: 'ok',
      version: '1.0.0',
    });
  });
  app.use('/api', routes);
  app.use((_req, res) =>
    res.status(404).json({ success: false, message: 'Route not found' }),
  );
  app.use(errorHandler);
  return app;
}
