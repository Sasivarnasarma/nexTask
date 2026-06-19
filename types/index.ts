export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'COLLABORATOR';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  mustResetPassword: boolean;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type UserProfile = User;

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  tags: string[];
  position: number;
  projectId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  comments?: Comment[];
  attachments?: Attachment[];
  assignees?: TaskAssignee[];
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  projectId: string;
  dueDate?: Date | string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  tags?: string[];
  position?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  dueDate?: Date | string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  tags?: string[];
  position?: number;
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
  token: string;
  mustResetPassword: boolean;
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

/**
 * Test functions for each password rule, keyed by rule ID.
 * Shared by both server validation and client-side strength meter.
 */
export const PASSWORD_RULE_TESTS: Record<string, (password: string) => boolean> = {
  length: (p) => p.length >= 8,
  uppercase: (p) => /[A-Z]/.test(p),
  lowercase: (p) => /[a-z]/.test(p),
  number: (p) => /[0-9]/.test(p),
  special: (p) => /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(p),
};

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a password against all PASSWORD_RULES.
 * Usable on both server and client — single source of truth.
 */
export function validatePasswordComplexity(password: string): PasswordValidationResult {
  const errors: string[] = [];
  for (const rule of PASSWORD_RULES) {
    const test = PASSWORD_RULE_TESTS[rule.id];
    if (test && !test(password)) {
      errors.push(`Password must satisfy: ${rule.label}.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  errors: Record<string, string> | null;
}

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
export type ProjectRole = 'PROJECT_MANAGER' | 'COLLABORATOR';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  endDate: Date | string | null;
  ownerId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: Date | string;
}

export interface TaskAssignment {
  taskId: string;
  userId: string;
  assignedAt: Date | string;
}

export interface TaskAssignee {
  userId: string;
  name: string | null;
  email: string;
  assignedAt: Date | string;
}

// ─── Web Push Subscription Payloads ───────────────────────────────────────────

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

// ─── Collaboration (Comments & Attachments) ───────────────────────────────────

export interface CommentAuthor {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author?: CommentAuthor;
  createdAt: Date | string;
  updatedAt: Date | string;
  attachments?: Attachment[];
}

export interface CreateCommentRequest {
  content: string;
  attachments?: CreateAttachmentRequest[];
}

export interface Attachment {
  id: string;
  filename: string;
  fileKey: string;
  presignedUrl?: string;
  mimeType: string;
  fileSize: number;
  taskId: string;
  commentId: string | null;
  uploadedById: string;
  createdAt: Date | string;
}

export interface CreateAttachmentRequest {
  filename: string;
  fileKey: string;
  mimeType: string;
  fileSize: number;
}

export interface GetPresignedUrlRequest {
  filename: string;
  mimeType: string;
  fileSize: number;
}

export interface GetPresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

// ─── Admin Management Payloads ────────────────────────────────────────────────

export interface AdminCreateUserRequest {
  email: string;
  name: string | null;
  role: UserRole;
}

export interface AdminUpdateUserRequest {
  name: string | null;
  email: string;
  role: UserRole;
}

export interface UserActivityResponse {
  id: string;
  action:
    | 'CREATED'
    | 'UPDATED'
    | 'ASSIGNED'
    | 'COMMENTED'
    | 'COMPLETED'
    | 'DELETED'
    | 'USER_CREATED'
    | 'USER_DEACTIVATED'
    | 'USER_ACTIVATED'
    | 'ROLE_CHANGED';
  description: string | null;
  createdAt: string;
  taskId: string | null;
  userId: string;
}
