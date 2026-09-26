import { NextFunction, Request, Response } from 'express';
import { getFirebaseAuth } from '../config/firebaseAdmin';

export interface AuthenticatedRequest extends Request {
  firebaseUid?: string;
  firebaseEmail?: string;
}

/// Verifies the Firebase ID token sent as `Authorization: Bearer <token>`.
/// The client obtains this token from FirebaseAuth.currentUser.getIdToken().
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const idToken = header.slice('Bearer '.length);

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(idToken);
    req.firebaseUid = decoded.uid;
    req.firebaseEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}
