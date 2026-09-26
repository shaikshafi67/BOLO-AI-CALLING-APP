import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  get databaseUrl() {
    return required('DATABASE_URL');
  },
  get jwtSecret() {
    return required('AUTH_SECRET');
  },
  get googleApplicationCredentials() {
    return required('GOOGLE_APPLICATION_CREDENTIALS');
  },
  get firebaseProjectId() {
    return required('FIREBASE_PROJECT_ID');
  },
  get firebaseClientEmail() {
    return required('FIREBASE_CLIENT_EMAIL');
  },
  get firebasePrivateKey() {
    // .env stores the key with literal \n sequences; convert to real newlines.
    return required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
  },
};
