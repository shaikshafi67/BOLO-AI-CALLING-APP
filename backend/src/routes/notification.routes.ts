import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { activeSessionGuard } from '../middleware/session.middleware';
import { pgSessionStore } from '../services/session.service';
import { notificationController } from '../controllers/notification.controller';

export const notificationRouter = Router();

// Signed in, and on the account's current device (one device at a time).
notificationRouter.use(requireAuth, activeSessionGuard(pgSessionStore));

notificationRouter.get('/', notificationController.list);
notificationRouter.post('/read-all', notificationController.markAllRead);
notificationRouter.patch('/:id/read', notificationController.markRead);
notificationRouter.delete('/:id', notificationController.remove);
