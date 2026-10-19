import fs from 'fs';
import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import { healthRouter } from './routes/health.routes';
import { userRouter } from './routes/user.routes';
import { callRouter } from './routes/call.routes';
import { createSessionRouter } from './routes/session.routes';
import { requireAuth } from './middleware/auth.middleware';
import { pgSessionStore } from './services/session.service';

export interface AppOptions {
  /// Called when an account signs in on a new device, to sign its other devices out.
  onSessionClaimed?: (uid: string, sessionId: string) => void;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/sessions', createSessionRouter(pgSessionStore, requireAuth, options.onSessionClaimed ?? (() => undefined)));
  app.use('/api/users', userRouter);
  app.use('/api/calls', callRouter);

  // Serves the built Flutter web app (frontend/build/web) from the same
  // address as the API, so one public link (e.g. a tunnel) runs everything.
  const webDir = path.resolve(__dirname, '..', '..', 'frontend', 'build', 'web');
  if (fs.existsSync(path.join(webDir, 'index.html'))) {
    // gzip: main.dart.js is ~3 MB raw, which is slow over a home upload link.
    app.use(compression());
    app.use(express.static(webDir));
  }

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
