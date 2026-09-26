export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'number', label: 'One number', test: (v) => /\d/.test(v) },
  { id: 'symbol', label: 'One special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** 0–4, one point per satisfied rule. */
export function passwordScore(value: string): number {
  return passwordRules.filter((r) => r.test(value)).length;
}
