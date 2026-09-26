import type { Translation } from '../types';
import { ago } from './time';

/**
 * Scripted Hindi ↔ English conversation for the video-call demo. It matches the
 * default call settings (you speak Hindi, Marcus speaks English).
 * These are pre-written examples of what the AI pipeline will produce, not live output.
 */
export const demoTranscript: Translation[] = [
  { id: 't_01', speakerId: 'local', speakerName: 'You', isLocal: true, sourceLanguage: 'hi', targetLanguage: 'en', originalText: 'Aap kaise hain?', translatedText: 'How are you?', timestamp: ago({ minutes: 4 }), status: 'completed' },
  { id: 't_02', speakerId: 'remote', speakerName: 'Marcus Bello', isLocal: false, sourceLanguage: 'en', targetLanguage: 'hi', originalText: "I'm doing great.", translatedText: 'Main bahut accha hoon.', timestamp: ago({ minutes: 3 }), status: 'completed' },
  { id: 't_03', speakerId: 'local', speakerName: 'You', isLocal: true, sourceLanguage: 'hi', targetLanguage: 'en', originalText: 'Kya aap project ka demo dekh sakte hain?', translatedText: 'Can you see the project demo?', timestamp: ago({ minutes: 2 }), status: 'completed' },
  { id: 't_04', speakerId: 'remote', speakerName: 'Marcus Bello', isLocal: false, sourceLanguage: 'en', targetLanguage: 'hi', originalText: 'Yes, and the captions are really clear.', translatedText: 'Haan, aur captions bahut saaf hain.', timestamp: ago({ minutes: 1 }), status: 'completed' },
];

/** Lines played one at a time during the demo to show the processing → ready states. */
export const demoQueue: Omit<Translation, 'id' | 'timestamp' | 'status'>[] = [
  { speakerId: 'remote', speakerName: 'Marcus Bello', isLocal: false, sourceLanguage: 'en', targetLanguage: 'hi', originalText: 'How was your day?', translatedText: 'Aapka din kaisa raha?' },
  { speakerId: 'local', speakerName: 'You', isLocal: true, sourceLanguage: 'hi', targetLanguage: 'en', originalText: 'Vyast tha, lekin accha. Poochne ke liye shukriya!', translatedText: 'Busy, but good. Thanks for asking!' },
  { speakerId: 'remote', speakerName: 'Marcus Bello', isLocal: false, sourceLanguage: 'en', targetLanguage: 'hi', originalText: "Let's talk again tomorrow.", translatedText: 'Chaliye kal phir baat karte hain.' },
];
