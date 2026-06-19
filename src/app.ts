import express, { Express, NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';
import { MessagePublisher } from './messaging/publisher';
import { buildRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';

// Browser clients (MFE/shell) are served from a different origin than this API, so
// the browser enforces CORS. Auth is carried in the Authorization header (no cookies),
// so a wildcard origin is safe; override with CORS_ORIGIN when locking it down.
function cors(req: Request, res: Response, next: NextFunction) {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

export function createApp(pool: Pool, publisher: MessagePublisher): Express {
  const app = express();
  app.use(cors);
  app.use(express.json());
  app.use(buildRouter(pool, publisher));
  app.use(errorHandler);
  return app;
}
