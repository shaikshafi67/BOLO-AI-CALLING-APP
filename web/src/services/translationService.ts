import type { LanguageCode, Translation } from '../types';
import { demoQueue, demoTranscript } from '../data/translations';
import { languages } from '../data/languages';
import { delay } from './config';

// TODO: Connect Translation API
// Plan: final STT transcripts are sent to the backend, which calls Google
// Cloud Translation and pushes { originalText, translatedText } to both
// participants over the signaling socket. The UI already renders that shape
// (see the Translation type).

export const translationService = {
  /** Whether a real translation backend is connected. False in the prototype. */
  isAvailable(): boolean {
    return false;
  },

  isLanguageSupported(code: LanguageCode): boolean {
    return languages.find((l) => l.code === code)?.status === 'available';
  },

  /** Pre-written transcript shown when a demo call opens. */
  getDemoTranscript(): Translation[] {
    return demoTranscript;
  },

  /**
   * Plays scripted demo lines to exercise the processing → ready UI states.
   * This is NOT real translation; every line is pre-written in data/translations.ts.
   */
  async nextDemoLine(index: number): Promise<Omit<Translation, 'id' | 'timestamp' | 'status'> | null> {
    await delay(1400);
    return demoQueue[index] ?? null;
  },
};
