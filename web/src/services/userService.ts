import type { Contact, User } from '../types';
import { contacts } from '../data/contacts';
import { delay } from './config';

// TODO: Connect backend database
// Backend routes that already exist (backend/src/routes/user.routes.ts):
//   GET   /api/users/me            → getProfile
//   PATCH /api/users/me/language   → updateProfile (language)
//   GET   /api/users/search?q=     → searchUsers
// Contacts endpoints are not built yet on the backend.

export const userService = {
  async updateProfile(user: User, changes: Partial<User>): Promise<User> {
    await delay(600);
    return { ...user, ...changes };
  },

  async getContacts(): Promise<Contact[]> {
    await delay(300);
    return contacts;
  },

  async addContact(email: string): Promise<Contact> {
    await delay(600);
    const name = email.split('@')[0].replace(/[._-]+/g, ' ');
    return {
      id: `c_${Date.now()}`,
      fullName: name.replace(/\b\w/g, (ch) => ch.toUpperCase()),
      email,
      preferredLanguage: 'en',
      status: 'offline',
    };
  },
};
