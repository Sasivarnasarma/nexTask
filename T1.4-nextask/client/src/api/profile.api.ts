// client/src/api/profile.api.ts
import { ProfileUpdateRequest, ProfileUpdateResponse, UserPublic } from "@nextask/types";
import apiClient from "./client";

export async function getProfile(): Promise<UserPublic> {
  const { data } = await apiClient.get<UserPublic>("/profile");
  return data;
}

export async function updateProfile(
  payload: ProfileUpdateRequest
): Promise<ProfileUpdateResponse> {
  const { data } = await apiClient.patch<ProfileUpdateResponse>("/profile", payload);
  return data;
}
