import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { callService } from '../services/call.service';
import { userService } from '../services/user.service';

const VALID_STATUSES = ['accepted', 'rejected', 'missed', 'ended'] as const;

export const callController = {
  async create(req: AuthenticatedRequest, res: Response) {
    const { receiverId } = req.body ?? {};
    if (typeof receiverId !== 'string' || receiverId.trim().length === 0) {
      res.status(400).json({ error: 'receiverId is required' });
      return;
    }

    const caller = await userService.getByFirebaseUid(req.firebaseUid!);
    if (!caller) {
      res.status(404).json({ error: 'Caller profile not found' });
      return;
    }
    if (caller.id === receiverId) {
      res.status(400).json({ error: 'Cannot call yourself' });
      return;
    }

    const call = await callService.create(caller.id, receiverId);
    res.status(201).json(call);
  },

  async updateStatus(req: AuthenticatedRequest, res: Response) {
    const { status } = req.body ?? {};
    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      return;
    }

    const call = await callService.getById(String(req.params.callId));
    if (!call) {
      res.status(404).json({ error: 'Call not found' });
      return;
    }

    const requester = await userService.getByFirebaseUid(req.firebaseUid!);
    if (!requester || (requester.id !== call.callerId && requester.id !== call.receiverId)) {
      res.status(403).json({ error: 'Not a participant in this call' });
      return;
    }

    const updated = await callService.updateStatus(call.id, status);
    res.json(updated);
  },

  async history(req: AuthenticatedRequest, res: Response) {
    const user = await userService.getByFirebaseUid(req.firebaseUid!);
    if (!user) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    const history = await callService.historyForUser(user.id);
    res.json(history);
  },
};
