import type { User } from '../types';
import { ago } from './time';

// Mock signed-in user. Will be replaced by the real profile from GET /api/users/me.
export const mockUser: User = {
  id: 'u_001',
  fullName: 'Shafi Shaik',
  email: 'shafi@boloai.app',
  preferredLanguage: 'hi',
  country: 'India',
  createdAt: ago({ days: 64 }),
};
