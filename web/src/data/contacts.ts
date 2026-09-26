import type { Contact } from '../types';
import { ago } from './time';

export const contacts: Contact[] = [
  { id: 'c_10', fullName: 'Marcus Bello', email: 'marcus.bello@example.com', preferredLanguage: 'en', status: 'online', lastCallAt: ago({ minutes: 40 }), location: 'London, UK' },
  { id: 'c_01', fullName: 'Rahul Sharma', email: 'rahul.sharma@example.com', preferredLanguage: 'hi', status: 'online', lastCallAt: ago({ hours: 2 }), location: 'Delhi, India' },
  { id: 'c_02', fullName: 'Aarav Mehta', email: 'aarav.mehta@example.com', preferredLanguage: 'hi', status: 'busy', lastCallAt: ago({ days: 1 }), location: 'Mumbai, India' },
  { id: 'c_03', fullName: 'Priya Reddy', email: 'priya.reddy@example.com', preferredLanguage: 'te', status: 'online', lastCallAt: ago({ days: 2 }), location: 'Hyderabad, India' },
  { id: 'c_04', fullName: 'Karthik Iyer', email: 'karthik.iyer@example.com', preferredLanguage: 'ta', status: 'away', lastCallAt: ago({ days: 3 }), location: 'Chennai, India' },
  { id: 'c_05', fullName: 'Emily Carter', email: 'emily.carter@example.com', preferredLanguage: 'en', status: 'offline', lastCallAt: ago({ days: 5 }), location: 'London, UK' },
  { id: 'c_06', fullName: 'Ananya Das', email: 'ananya.das@example.com', preferredLanguage: 'bn', status: 'online', lastCallAt: ago({ days: 8 }), location: 'Kolkata, India' },
  { id: 'c_07', fullName: 'Rohan Patil', email: 'rohan.patil@example.com', preferredLanguage: 'mr', status: 'offline', lastCallAt: ago({ days: 12 }), location: 'Pune, India' },
  { id: 'c_08', fullName: 'Meera Nair', email: 'meera.nair@example.com', preferredLanguage: 'ml', status: 'away', location: 'Kochi, India' },
  { id: 'c_09', fullName: 'Daniel Kim', email: 'daniel.kim@example.com', preferredLanguage: 'en', status: 'online', lastCallAt: ago({ days: 20 }), location: 'Toronto, Canada' },
];
