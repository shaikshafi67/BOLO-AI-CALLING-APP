import type { AppNotification } from '../types';
import { ago } from './time';

export const notifications: AppNotification[] = [
  { id: 'n_01', type: 'incoming_call', title: 'Incoming call', message: 'Rahul is calling you.', actorName: 'Rahul Sharma', createdAt: ago({ minutes: 3 }), read: false },
  { id: 'n_02', type: 'call_ended', title: 'Call ended', message: 'Your call with Aarav has ended. Duration 14:32.', actorName: 'Aarav Mehta', createdAt: ago({ hours: 1 }), read: false },
  { id: 'n_03', type: 'system', title: 'Translation service', message: 'Translation service is ready. (Demo notification: the AI backend is not connected yet.)', createdAt: ago({ hours: 5 }), read: false },
  { id: 'n_04', type: 'contact_request', title: 'New contact request', message: 'Meera Nair wants to add you as a contact.', actorName: 'Meera Nair', createdAt: ago({ days: 1 }), read: true },
  { id: 'n_05', type: 'missed_call', title: 'Missed call', message: 'You missed a call from Karthik Iyer.', actorName: 'Karthik Iyer', createdAt: ago({ days: 3 }), read: true },
  { id: 'n_06', type: 'system', title: 'Welcome to BoloAI', message: 'Set your preferred language in Settings to personalise translations.', createdAt: ago({ days: 7 }), read: true },
];
