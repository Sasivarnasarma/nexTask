// client/src/api/auth.api.ts
import { LoginRequest, LoginResponse, PasswordResetRequest } from "@nextask/types";
import apiClient from "./client";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", payload);
  return data;
}

export async function resetPassword(
  payload: PasswordResetRequest
): Promise<LoginResponse & { message: string }> {
  const { data } = await apiClient.post("/auth/password-reset", payload);
  return data;
}
