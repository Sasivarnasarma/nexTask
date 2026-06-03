// ─── User & Auth Types (shared between server + client) ─────────────────────

export type UserRole = "admin" | "manager" | "member";

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  timezone: string;
  mustResetPassword: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth Payloads ────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserPublic;
  mustResetPassword: boolean;
}

export interface PasswordResetRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetResponse {
  message: string;
}

// ─── Profile Payloads ─────────────────────────────────────────────────────────

export interface ProfileUpdateRequest {
  name?: string;
  bio?: string;
  phone?: string;
  timezone?: string;
  avatarUrl?: string | null;
}

export interface ProfileUpdateResponse {
  user: UserPublic;
}

// ─── Password Complexity ──────────────────────────────────────────────────────

export interface PasswordRule {
  id: string;
  label: string;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters" },
  { id: "uppercase", label: "One uppercase letter (A–Z)" },
  { id: "lowercase", label: "One lowercase letter (a–z)" },
  { id: "number", label: "One number (0–9)" },
  { id: "special", label: "One special character (!@#$%^&*…)" },
];

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
