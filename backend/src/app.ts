import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.routes';
import { userRouter } from './routes/user.routes';
import { callRouter } from './routes/call.routes';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/users', userRouter);
  app.use('/api/calls', callRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Catches errors thrown by async route handlers (Express 5 forwards
  // rejected promises from handlers automatically).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
