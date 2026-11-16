import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { env } from './env';

let app: App | undefined;

export function getFirebaseApp(): App {
  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: env.firebaseProjectId,
          clientEmail: env.firebaseClientEmail,
          privateKey: env.firebasePrivateKey,
        }),
      });
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
