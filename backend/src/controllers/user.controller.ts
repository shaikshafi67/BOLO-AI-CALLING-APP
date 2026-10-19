import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { userService } from '../services/user.service';
import { supportedLanguageCodes, isSupportedLanguageCode } from '../config/supportedLanguages';

export const userController = {
  async createProfile(req: AuthenticatedRequest, res: Response) {
    const { name, preferredLanguage } = req.body ?? {};

    if (typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    if (typeof preferredLanguage !== 'string' || !isSupportedLanguageCode(preferredLanguage)) {
      res.status(400).json({ error: `preferredLanguage must be one of: ${supportedLanguageCodes.join(', ')}` });
      return;
    }

    const existing = await userService.getByFirebaseUid(req.firebaseUid!);
    if (existing) {
      res.status(409).json({ error: 'Profile already exists for this account' });
      return;
    }

    const user = await userService.createProfile({
      firebaseUid: req.firebaseUid!,
      name: name.trim(),
      email: req.firebaseEmail!,
      preferredLanguage,
    });
    res.status(201).json(user);
  },

  async getMe(req: AuthenticatedRequest, res: Response) {
    const user = await userService.getByFirebaseUid(req.firebaseUid!);
    if (!user) {
      res.status(404).json({ error: 'Profile not found. Call POST /api/users to create one.' });
      return;
    }
    res.json(user);
  },

  async updateLanguage(req: AuthenticatedRequest, res: Response) {
    const { preferredLanguage } = req.body ?? {};
    if (typeof preferredLanguage !== 'string' || !isSupportedLanguageCode(preferredLanguage)) {
      res.status(400).json({ error: `preferredLanguage must be one of: ${supportedLanguageCodes.join(', ')}` });
      return;
    }
    const user = await userService.updatePreferredLanguage(req.firebaseUid!, preferredLanguage);
    if (!user) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(user);
  },

  async search(req: AuthenticatedRequest, res: Response) {
    const query = String(req.query.q ?? '').trim();
    if (query.length === 0) {
      res.json([]);
      return;
    }
    const users = await userService.search(query, req.firebaseUid!);
    // Only what other people need to see: no email or Firebase uid.
    res.json(users.map(({ id, name, preferredLanguage, avatarUrl }) => ({ id, name, preferredLanguage, avatarUrl })));
  },
};
