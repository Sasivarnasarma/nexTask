// server/src/lib/password.ts
import argon2 from "argon2";

// ─── Hashing (argon2id – industry standard for passwords) ────────────────────

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// ─── Complexity Rules  ────────────────────────────────────────────────────────
// Single source of truth – mirrored in the shared types package for the client.

export interface PasswordComplexityRule {
  id: string;
  label: string;
  test: (p: string) => boolean;
}

export const PASSWORD_COMPLEXITY_RULES: PasswordComplexityRule[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (p) => p.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter (A–Z)",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lowercase",
    label: "One lowercase letter (a–z)",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "number",
    label: "One number (0–9)",
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: "special",
    label: "One special character (!@#$%^&*…)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

/** Returns true only when ALL complexity rules pass. */
export function isPasswordComplex(password: string): boolean {
  return PASSWORD_COMPLEXITY_RULES.every((rule) => rule.test(password));
}

/** Returns labels of every rule that fails for a given password. */
export function getPasswordErrors(password: string): string[] {
  return PASSWORD_COMPLEXITY_RULES.filter((rule) => !rule.test(password)).map(
    (rule) => rule.label
  );
}
