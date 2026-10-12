import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { activeSessionGuard } from '../middleware/session.middleware';
import { pgSessionStore } from '../services/session.service';
import { userController } from '../controllers/user.controller';

export const userRouter = Router();

// Signed in, and on the account's current device (one device at a time).
userRouter.use(requireAuth, activeSessionGuard(pgSessionStore));

userRouter.post('/', userController.createProfile);
userRouter.get('/me', userController.getMe);
userRouter.patch('/me/language', userController.updateLanguage);
userRouter.get('/search', userController.search);
