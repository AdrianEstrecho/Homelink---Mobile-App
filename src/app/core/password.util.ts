// Ported from frontend/src/utils/password.js — must stay in sync with the
// backend's own validatePasswordStrength (backend/utils/password.js).

export interface PasswordRule {
  key: string;
  label: string;
  test: (password: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
  { key: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { key: 'lower', label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { key: 'upper', label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'number', label: 'One number', test: (pw) => /[0-9]/.test(pw) },
];

export function isPasswordValid(password: string): boolean {
  return passwordRules.every((rule) => rule.test(password || ''));
}
