import type { Call } from '../types';
import { ago } from './time';

const c = (id: string, fullName: string) => ({ id, fullName });

export const calls: Call[] = [
  { id: 'call_00', roomCode: 'BOLO-5307', contact: c('c_10', 'Marcus Bello'), sourceLanguage: 'hi', targetLanguage: 'en', direction: 'outgoing', status: 'completed', startedAt: ago({ minutes: 40 }), durationSeconds: 495, translatedSegments: 31 },
  { id: 'call_01', roomCode: 'BOLO-4829', contact: c('c_01', 'Rahul Sharma'), sourceLanguage: 'hi', targetLanguage: 'en', direction: 'outgoing', status: 'completed', startedAt: ago({ hours: 2 }), durationSeconds: 762, translatedSegments: 48 },
  { id: 'call_02', roomCode: 'BOLO-7314', contact: c('c_02', 'Aarav Mehta'), sourceLanguage: 'hi', targetLanguage: 'en', direction: 'incoming', status: 'completed', startedAt: ago({ days: 1, hours: 3 }), durationSeconds: 872, translatedSegments: 61 },
  { id: 'call_03', roomCode: 'BOLO-1956', contact: c('c_03', 'Priya Reddy'), sourceLanguage: 'te', targetLanguage: 'en', direction: 'outgoing', status: 'completed', startedAt: ago({ days: 2, hours: 1 }), durationSeconds: 1325, translatedSegments: 90 },
  { id: 'call_04', roomCode: 'BOLO-6620', contact: c('c_04', 'Karthik Iyer'), sourceLanguage: 'ta', targetLanguage: 'hi', direction: 'incoming', status: 'missed', startedAt: ago({ days: 3, hours: 6 }), durationSeconds: 0, translatedSegments: 0 },
  { id: 'call_05', roomCode: 'BOLO-3048', contact: c('c_05', 'Emily Carter'), sourceLanguage: 'en', targetLanguage: 'hi', direction: 'outgoing', status: 'completed', startedAt: ago({ days: 5 }), durationSeconds: 488, translatedSegments: 27 },
  { id: 'call_06', roomCode: 'BOLO-8812', contact: c('c_01', 'Rahul Sharma'), sourceLanguage: 'en', targetLanguage: 'hi', direction: 'incoming', status: 'declined', startedAt: ago({ days: 6, hours: 2 }), durationSeconds: 0, translatedSegments: 0 },
  { id: 'call_07', roomCode: 'BOLO-2275', contact: c('c_06', 'Ananya Das'), sourceLanguage: 'bn', targetLanguage: 'en', direction: 'outgoing', status: 'failed', startedAt: ago({ days: 8 }), durationSeconds: 14, translatedSegments: 0 },
  { id: 'call_08', roomCode: 'BOLO-5190', contact: c('c_03', 'Priya Reddy'), sourceLanguage: 'en', targetLanguage: 'te', direction: 'incoming', status: 'completed', startedAt: ago({ days: 10 }), durationSeconds: 2104, translatedSegments: 132 },
  { id: 'call_09', roomCode: 'BOLO-9403', contact: c('c_07', 'Rohan Patil'), sourceLanguage: 'mr', targetLanguage: 'en', direction: 'outgoing', status: 'missed', startedAt: ago({ days: 12 }), durationSeconds: 0, translatedSegments: 0 },
  { id: 'call_10', roomCode: 'BOLO-6751', contact: c('c_09', 'Daniel Kim'), sourceLanguage: 'en', targetLanguage: 'ta', direction: 'outgoing', status: 'completed', startedAt: ago({ days: 20 }), durationSeconds: 655, translatedSegments: 39 },
  { id: 'call_11', roomCode: 'BOLO-4417', contact: c('c_04', 'Karthik Iyer'), sourceLanguage: 'ta', targetLanguage: 'en', direction: 'incoming', status: 'completed', startedAt: ago({ days: 24 }), durationSeconds: 1540, translatedSegments: 101 },
  { id: 'call_12', roomCode: 'BOLO-3386', contact: c('c_02', 'Aarav Mehta'), sourceLanguage: 'en', targetLanguage: 'hi', direction: 'outgoing', status: 'completed', startedAt: ago({ days: 31 }), durationSeconds: 921, translatedSegments: 58 },
  { id: 'call_13', roomCode: 'BOLO-7702', contact: c('c_05', 'Emily Carter'), sourceLanguage: 'en', targetLanguage: 'hi', direction: 'incoming', status: 'completed', startedAt: ago({ days: 40 }), durationSeconds: 377, translatedSegments: 22 },
];
