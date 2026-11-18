import fs from 'fs';
import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import { healthRouter } from './routes/health.routes';
import { userRouter } from './routes/user.routes';
import { callRouter } from './routes/call.routes';
import { notificationRouter } from './routes/notification.routes';
import { createSessionRouter } from './routes/session.routes';
import { requireAuth } from './middleware/auth.middleware';
import { pgSessionStore } from './services/session.service';
import { createVerificationRouter } from './routes/verification.routes';
import { createEmailVerification } from './verification/emailVerification';
import { firebaseAccounts, pgCodeStore } from './services/emailVerification.service';
import { smtpMailer } from './services/mailer';

/// New email/password accounts created on or after this date verify their email once.
const verificationRequiredSince = new Date(process.env.EMAIL_VERIFICATION_SINCE ?? '2026-11-18T00:00:00Z');

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
  app.use('/api/notifications', notificationRouter);
  app.use(
    '/api/verification',
    createVerificationRouter(
      requireAuth,
      createEmailVerification({
        store: pgCodeStore,
        accounts: firebaseAccounts,
        mailer: smtpMailer,
        requiredSince: verificationRequiredSince,
        // In development the code is printed in the server log instead of emailed.
        enabled: () => smtpMailer.configured() || process.env.NODE_ENV !== 'production',
      }),
    ),
  );

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
