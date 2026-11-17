import type { LanguageCode } from '../types';
import { languages } from '../data/languages';

// Live translation itself runs on the backend during calls (see callSession.ts).

export const translationService = {
  isLanguageSupported(code: LanguageCode): boolean {
    return languages.find((l) => l.code === code)?.status === 'available';
  },
};
