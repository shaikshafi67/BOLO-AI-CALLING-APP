import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { userController } from '../controllers/user.controller';

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.post('/', userController.createProfile);
userRouter.get('/me', userController.getMe);
userRouter.patch('/me/language', userController.updateLanguage);
userRouter.get('/search', userController.search);
