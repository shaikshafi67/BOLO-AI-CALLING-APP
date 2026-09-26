import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { callController } from '../controllers/call.controller';

export const callRouter = Router();

callRouter.use(requireAuth);

callRouter.post('/', callController.create);
callRouter.get('/', callController.history);
callRouter.patch('/:callId/status', callController.updateStatus);
