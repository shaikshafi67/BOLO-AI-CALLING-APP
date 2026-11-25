export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

/** How strong a password looks (0–3), for a hint only; just the length is required. */
export function passwordStrength(value: string): number {
  if (value.length < MIN_PASSWORD_LENGTH) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length;
  return value.length >= 12 || variety >= 3 ? 3 : variety >= 2 ? 2 : 1;
}

/** The phone's or browser's language, if BoloAI supports it (else English). */
export function deviceLanguage(): 'en' | 'hi' | 'te' | 'ta' {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag.toLowerCase().split('-')[0];
    if (code === 'hi' || code === 'te' || code === 'ta' || code === 'en') return code;
  }
  return 'en';
}
