import { RequestHandler, Response, Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { SESSION_ID_PATTERN, SessionStore } from '../sessions/sessionStore';

/// POST   /api/sessions  { sessionId, device? }  claim this device after sign-in
/// DELETE /api/sessions  (X-Session-Id)          release it on sign-out
///
/// [onClaimed] signs the account's other devices out in real time
/// (the signaling server sends them `session:revoked`).
export function createSessionRouter(
  store: SessionStore,
  auth: RequestHandler,
  onClaimed: (uid: string, sessionId: string) => void,
) {
  const router = Router();
  router.use(auth);

  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, device } = req.body ?? {};
    if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
      res.status(400).json({ error: 'sessionId must be 16-128 letters, digits, - or _' });
      return;
    }
    const deviceLabel = typeof device === 'string' ? device.slice(0, 80) : undefined;
    const previous = await store.claim(req.firebaseUid!, sessionId, deviceLabel);
    onClaimed(req.firebaseUid!, sessionId);
    res.json({ ok: true, signedOutOtherDevice: previous !== null && previous !== sessionId });
  });

  router.delete('/', async (req: AuthenticatedRequest, res: Response) => {
    const sessionId = req.header('x-session-id');
    if (sessionId) await store.release(req.firebaseUid!, sessionId);
    res.status(204).end();
  });

  return router;
}
