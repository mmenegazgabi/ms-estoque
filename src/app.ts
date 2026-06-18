import express, { Express } from 'express';
import { Pool } from 'pg';
import { MessagePublisher } from './messaging/publisher';
import { buildRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(pool: Pool, publisher: MessagePublisher): Express {
  const app = express();
  app.use(express.json());
  app.use(buildRouter(pool, publisher));
  app.use(errorHandler);
  return app;
}
