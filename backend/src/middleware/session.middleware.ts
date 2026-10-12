import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { SessionStore, sessionStatus } from '../sessions/sessionStore';

/// Runs after requireAuth. Only the account's most recently signed-in device
/// may call the API; it identifies itself with the `X-Session-Id` header.
export function activeSessionGuard(store: SessionStore) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const sessionId = req.header('x-session-id');
    if (!sessionId) {
      res.status(401).json({ error: 'session_required', message: 'Send the X-Session-Id header from POST /api/sessions.' });
      return;
    }
    const status = await sessionStatus(store, req.firebaseUid!, sessionId);
    if (status === 'replaced') {
      res.status(401).json({ error: 'session_replaced', message: 'This account signed in on another device.' });
      return;
    }
    if (status === 'inactive') {
      res.status(401).json({ error: 'session_inactive', message: 'Claim a session with POST /api/sessions first.' });
      return;
    }
    next();
  };
}
