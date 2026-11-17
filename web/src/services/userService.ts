import type { Call, Contact, LanguageCode, User } from '../types';
import { api, ApiError } from './api';
import { authService } from './authService';

/** A backend profile (backend/src/models/user.model.ts). */
export interface Profile {
  id: string;
  name: string;
  email: string;
  preferredLanguage: LanguageCode;
  createdAt: string;
}

const supported: LanguageCode[] = ['en', 'hi', 'te', 'ta'];

/** Profiles, people search and contacts (backend/src/routes/user.routes.ts). */
export const userService = {
  /** GET /api/users/me, creating the profile for accounts that don't have one yet. */
  async syncProfile(name: string, language: LanguageCode = 'hi'): Promise<Profile | null> {
    try {
      return await api<Profile>('GET', '/users/me');
    } catch (e) {
      if (!(e instanceof ApiError) || !e.notFound) throw e;
    }
    try {
      return await api<Profile>('POST', '/users', { name, preferredLanguage: supported.includes(language) ? language : 'en' });
    } catch (e) {
      // Created meanwhile (e.g. by the Flutter app).
      if (e instanceof ApiError && e.status === 409) return api<Profile>('GET', '/users/me');
      throw e;
    }
  },

  /** Saves name and language to Firebase and the backend profile. */
  async updateProfile(user: User, changes: Partial<User>): Promise<User> {
    const next = { ...user, ...changes };
    if (changes.fullName && changes.fullName !== user.fullName) {
      await authService.updateDisplayName(changes.fullName);
      await api('PATCH', '/users/me', { name: changes.fullName });
    }
    if (changes.preferredLanguage && changes.preferredLanguage !== user.preferredLanguage && supported.includes(changes.preferredLanguage)) {
      await api('PATCH', '/users/me/language', { preferredLanguage: changes.preferredLanguage });
    }
    return next;
  },

  /** Registered people whose name matches (GET /api/users/search). */
  async search(query: string): Promise<Contact[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const rows = await api<{ id: string; name: string; preferredLanguage: LanguageCode }[]>('GET', `/users/search?q=${encodeURIComponent(q)}`);
    return rows.map((r) => ({ id: r.id, fullName: r.name, email: '', preferredLanguage: r.preferredLanguage, status: 'offline' }));
  },

  /** Your contacts: everyone you've had a call with, most recent first. */
  contactsFromCalls(calls: Call[]): Contact[] {
    const seen = new Map<string, Contact>();
    for (const c of calls) {
      if (!c.contact.id || seen.has(c.contact.id)) continue;
      seen.set(c.contact.id, {
        id: c.contact.id,
        fullName: c.contact.fullName,
        email: '',
        preferredLanguage: c.targetLanguage,
        status: 'offline',
        lastCallAt: c.startedAt,
      });
    }
    return [...seen.values()];
  },
};
