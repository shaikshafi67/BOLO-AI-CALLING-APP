import { RequestHandler, Response, Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { SESSION_ID_PATTERN, SessionStore } from '../sessions/sessionStore';

/// POST   /api/sessions  { sessionId, device? }  claim this device after sign-in
/// DELETE /api/sessions  (X-Session-Id)          release it on sign-out
/// PUT    /api/sessions/push-token  { token }   (X-Session-Id)  where to push
///        incoming calls when the app is closed; `token: null` stops pushes
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

  router.put('/push-token', async (req: AuthenticatedRequest, res: Response) => {
    const sessionId = req.header('x-session-id');
    const { token } = req.body ?? {};
    if (token !== null && (typeof token !== 'string' || token.length === 0 || token.length > 4096)) {
      res.status(400).json({ error: 'token must be a push token string or null' });
      return;
    }
    if (!sessionId || !(await store.setPushToken(req.firebaseUid!, sessionId, token))) {
      res.status(401).json({ error: 'session_inactive', message: 'Claim a session with POST /api/sessions first.' });
      return;
    }
    res.status(204).end();
  });

  router.delete('/', async (req: AuthenticatedRequest, res: Response) => {
    const sessionId = req.header('x-session-id');
    if (sessionId) await store.release(req.firebaseUid!, sessionId);
    res.status(204).end();
  });

  return router;
}
