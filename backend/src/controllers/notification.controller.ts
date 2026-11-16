import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { userService } from '../services/user.service';

/// The signed-in user's profile id, or null after replying 404.
async function profileId(req: AuthenticatedRequest, res: Response): Promise<string | null> {
  const user = await userService.getByFirebaseUid(req.firebaseUid!);
  if (!user) {
    res.status(404).json({ error: 'Profile not found' });
    return null;
  }
  return user.id;
}

export const notificationController = {
  async list(req: AuthenticatedRequest, res: Response) {
    const userId = await profileId(req, res);
    if (!userId) return;
    res.json(await notificationService.listForUser(userId));
  },

  async markRead(req: AuthenticatedRequest, res: Response) {
    const userId = await profileId(req, res);
    if (!userId) return;
    if (!(await notificationService.markRead(userId, String(req.params.id)))) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.status(204).end();
  },

  async markAllRead(req: AuthenticatedRequest, res: Response) {
    const userId = await profileId(req, res);
    if (!userId) return;
    await notificationService.markAllRead(userId);
    res.status(204).end();
  },

  async remove(req: AuthenticatedRequest, res: Response) {
    const userId = await profileId(req, res);
    if (!userId) return;
    if (!(await notificationService.remove(userId, String(req.params.id)))) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.status(204).end();
  },
};
