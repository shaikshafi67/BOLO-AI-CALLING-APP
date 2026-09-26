/// Mirrors frontend/lib/config/supported_languages.dart. Keep both in sync
/// when adding a language — this is the backend's validation source of truth.
export const supportedLanguageCodes = ['en', 'hi', 'te', 'ta'] as const;

export type SupportedLanguageCode = (typeof supportedLanguageCodes)[number];

export function isSupportedLanguageCode(value: string): value is SupportedLanguageCode {
  return (supportedLanguageCodes as readonly string[]).includes(value);
}
