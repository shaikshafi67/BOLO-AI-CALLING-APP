import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { activeSessionGuard } from '../middleware/session.middleware';
import { pgSessionStore } from '../services/session.service';
import { callController } from '../controllers/call.controller';

export const callRouter = Router();

// Signed in, and on the account's current device (one device at a time).
callRouter.use(requireAuth, activeSessionGuard(pgSessionStore));

callRouter.post('/', callController.create);
callRouter.get('/', callController.history);
callRouter.patch('/:callId/status', callController.updateStatus);
