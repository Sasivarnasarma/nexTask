export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'COLLABORATOR';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  mustResetPassword: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  assignedUserId?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─── Auth Payloads ────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  mustResetPassword: boolean;
}

export interface PasswordResetRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface PasswordResetResponse {
  message: string;
  token: string;
}

// ─── Profile Payloads ─────────────────────────────────────────────────────────

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

// ─── Password Complexity ──────────────────────────────────────────────────────

export interface PasswordRule {
  id: string;
  label: string;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters' },
  { id: 'uppercase', label: 'One uppercase letter (A–Z)' },
  { id: 'lowercase', label: 'One lowercase letter (a–z)' },
  { id: 'number', label: 'One number (0–9)' },
  { id: 'special', label: 'One special character (!@#$%^&*…)' },
];

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T = null> {
  status: 'success' | 'error';
  message: string;
  data: T;
  error: string | null;
}
