import fs from 'fs';
import { Router } from 'express';

export const healthRouter = Router();

/// Reports whether each external dependency is configured (never the values).
function configStatus() {
  const set = (name: string) => Boolean(process.env[name]?.trim());
  return {
    database: set('DATABASE_URL'),
    firebaseAdmin: set('FIREBASE_PROJECT_ID') && set('FIREBASE_CLIENT_EMAIL') && set('FIREBASE_PRIVATE_KEY'),
    // The key file must actually exist, not just be named in .env.
    googleCloud: set('GOOGLE_APPLICATION_CREDENTIALS') && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!),
  };
}

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'boloai-backend', timestamp: new Date().toISOString(), config: configStatus() });
});
