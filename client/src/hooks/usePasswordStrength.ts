import { useMemo } from 'react';

interface Rule {
  id: string;
  label: string;
  test: (p: string) => boolean;
  met: boolean;
}

// These MUST mirror server/src/utils/password.util.ts exactly
const RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter (a–z)', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0–9)', test: (p: string) => /[0-9]/.test(p) },
  {
    id: 'special',
    label: 'One special character (!@#$%^&*…)',
    test: (p: string) => /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(p),
  },
];

type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

interface PasswordStrength {
  rules: Rule[];
  metCount: number;
  totalCount: number;
  isValid: boolean;
  level: StrengthLevel;
  percentage: number;
  color: string;
  label: string;
}

const LEVELS: Record<number, { level: StrengthLevel; color: string; label: string }> = {
  0: { level: 'empty', color: '#3f3f46', label: '' },
  1: { level: 'weak', color: '#ef4444', label: 'Weak' },
  2: { level: 'weak', color: '#ef4444', label: 'Weak' },
  3: { level: 'fair', color: '#f59e0b', label: 'Fair' },
  4: { level: 'good', color: '#3b82f6', label: 'Good' },
  5: { level: 'strong', color: '#22c55e', label: 'Strong' },
};

export function usePasswordStrength(password: string): PasswordStrength {
  return useMemo(() => {
    const rules: Rule[] = RULES.map((r) => ({ ...r, met: r.test(password) }));
    const metCount = rules.filter((r) => r.met).length;
    const { level, color, label } = LEVELS[metCount];

    return {
      rules,
      metCount,
      totalCount: RULES.length,
      isValid: metCount === RULES.length,
      level,
      percentage: (metCount / RULES.length) * 100,
      color,
      label,
    };
  }, [password]);
}
