import fs from 'fs';
import { Router } from 'express';
import { getFirebaseApp } from '../config/firebaseAdmin';

export const healthRouter = Router();

/// Reports whether each external dependency is configured (never the values).
function configStatus() {
  const set = (name: string) => Boolean(process.env[name]?.trim());
  return {
    database: set('DATABASE_URL'),
    firebaseAdmin: set('FIREBASE_PROJECT_ID') && set('FIREBASE_CLIENT_EMAIL') && set('FIREBASE_PRIVATE_KEY'),
    // The key file must actually exist, not just be named in .env.
    googleCloud: set('GOOGLE_APPLICATION_CREDENTIALS') && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!),
    email: set('SMTP_HOST') && set('SMTP_USER') && set('SMTP_PASS'),
  };
}

/// Whether Firebase Admin can actually start with the configured key (a key
/// pasted with quotes or broken line breaks fails here and rejects every
/// sign-in). Describes the problem without revealing the key.
function firebaseAdminProblem(): string | null {
  const key = process.env.FIREBASE_PRIVATE_KEY?.trim() ?? '';
  if (!key) return 'FIREBASE_PRIVATE_KEY is not set';
  if (/^["']/.test(key)) return 'FIREBASE_PRIVATE_KEY starts with a quote: paste it without the surrounding quotes';
  if (!key.includes('BEGIN PRIVATE KEY') || !key.includes('END PRIVATE KEY')) return 'FIREBASE_PRIVATE_KEY is incomplete: it must include the BEGIN and END lines';
  try {
    getFirebaseApp();
    return null;
  } catch (err) {
    return `Firebase Admin could not start: ${(err as Error).message.split('\n')[0]}`;
  }
}

healthRouter.get('/', (_req, res) => {
  const config = configStatus();
  const problem = config.firebaseAdmin ? firebaseAdminProblem() : null;
  res.json({
    status: 'ok',
    service: 'boloai-backend',
    timestamp: new Date().toISOString(),
    config: { ...config, firebaseAdmin: config.firebaseAdmin && problem === null },
    ...(problem ? { problems: [problem] } : {}),
  });
});
