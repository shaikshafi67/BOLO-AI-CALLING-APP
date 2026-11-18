import { RequestHandler, Response, Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import type { createEmailVerification, VerificationResult } from '../verification/emailVerification';

/// GET  /api/verification         { verified, required }  does this account still need to verify?
/// POST /api/verification/send    emails a 6-digit code (once a minute)
/// POST /api/verification/verify  { code }  marks the account verified
///
/// Only new email/password accounts are asked, once, right after sign-up.
export function createVerificationRouter(auth: RequestHandler, verification: ReturnType<typeof createEmailVerification>) {
  const router = Router();
  router.use(auth);

  const reply = (res: Response, result: VerificationResult) => {
    if (result.ok) {
      const { ok: _ok, ...body } = result;
      res.json(body);
    } else {
      const { ok: _ok, status, ...body } = result;
      res.status(status).json(body);
    }
  };

  router.get('/', async (req: AuthenticatedRequest, res) => reply(res, await verification.status(req.firebaseUid!)));
  router.post('/send', async (req: AuthenticatedRequest, res) => reply(res, await verification.send(req.firebaseUid!)));
  router.post('/verify', async (req: AuthenticatedRequest, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code : '';
    reply(res, await verification.verify(req.firebaseUid!, code));
  });

  return router;
}
