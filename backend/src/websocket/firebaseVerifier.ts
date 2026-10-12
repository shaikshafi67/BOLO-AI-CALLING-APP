import { getFirebaseAuth } from '../config/firebaseAdmin';
import type { TokenVerifier } from './signaling';

/// Verifies socket tokens with Firebase Admin — the same check the REST API
/// uses in auth.middleware.ts. Kept separate so the signaling server can be
/// tested without loading the Firebase SDK.
export const firebaseVerifier: TokenVerifier = async (idToken) => {
  const decoded = await getFirebaseAuth().verifyIdToken(idToken);
  return { uid: decoded.uid, email: decoded.email, name: decoded.name as string | undefined };
};
