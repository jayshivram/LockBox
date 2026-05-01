import type { StrengthResult } from '../types';

const COMMON_PASSWORDS = new Set([
  'password','123456','password1','qwerty','abc123','letmein','monkey',
  'master','dragon','pass','test','hello','admin','login','welcome',
  'shadow','sunshine','princess','superman','batman','trustno1','iloveyou',
]);

export function calculateEntropy(password: string): number {
  const charsets: { regex: RegExp; size: number }[] = [
    { regex: /[a-z]/, size: 26 },
    { regex: /[A-Z]/, size: 26 },
    { regex: /[0-9]/, size: 10 },
    { regex: /[^a-zA-Z0-9]/, size: 32 },
  ];
  let poolSize = 0;
  for (const cs of charsets) {
    if (cs.regex.test(password)) poolSize += cs.size;
  }
  return Math.floor(password.length * Math.log2(Math.max(poolSize, 1)));
}

export function checkStrength(password: string): StrengthResult {
  const feedback: string[] = [];
  if (!password) {
    return { score: 0, label: 'Very Weak', entropy: 0, feedback: ['Enter a password'], color: '#EF4444' };
  }
  const entropy = calculateEntropy(password);
  const lower = password.toLowerCase();

  if (COMMON_PASSWORDS.has(lower)) {
    feedback.push('This is a commonly used password');
  }
  if (password.length < 8) feedback.push('Too short — use at least 8 characters');
  if (!/[A-Z]/.test(password)) feedback.push('Add uppercase letters');
  if (!/[0-9]/.test(password)) feedback.push('Add numbers');
  if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('Add special characters');
  if (/(.)\1{2,}/.test(password)) feedback.push('Avoid repeated characters');
  if (/^[a-zA-Z]+$/.test(password)) feedback.push('Mix letters with numbers and symbols');

  let score: 0 | 1 | 2 | 3 | 4;
  let label: StrengthResult['label'];
  let color: string;

  if (COMMON_PASSWORDS.has(lower) || entropy < 25) {
    score = 0; label = 'Very Weak'; color = '#EF4444';
  } else if (entropy < 40) {
    score = 1; label = 'Weak'; color = '#F97316';
  } else if (entropy < 55) {
    score = 2; label = 'Fair'; color = '#F59E0B';
  } else if (entropy < 70) {
    score = 3; label = 'Strong'; color = '#22C55E';
  } else {
    score = 4; label = 'Very Strong'; color = '#10B981';
  }

  if (feedback.length === 0 && score >= 3) {
    feedback.push(`Excellent! ${entropy}-bit entropy`);
  }

  return { score, label, entropy, feedback, color };
}
