import type { Language, LanguageCode } from '../types';

// `available` mirrors backend/src/config/supportedLanguages.ts (en, hi, te, ta).
// Actual availability still depends on the connected AI services.
export const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', status: 'available' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', status: 'available' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', status: 'available' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', status: 'available' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', status: 'planned' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', status: 'planned' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', status: 'planned' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', status: 'planned' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', status: 'planned' },
];

export function getLanguage(code: LanguageCode): Language {
  return languages.find((l) => l.code === code) ?? languages[0];
}
