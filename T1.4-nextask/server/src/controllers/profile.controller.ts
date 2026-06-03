// server/src/controllers/profile.controller.ts
import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "@tsoa/runtime";
import { Request as ExpressRequest } from "express";
import { ProfileUpdateRequest, ProfileUpdateResponse, UserPublic } from "@nextask/types";
import { getUserProfile, updateUserProfile } from "../services/profile.service";

interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

@Route("profile")
@Tags("Profile")
@Security("BearerAuth")
export class ProfileController extends Controller {
  /**
   * Get the currently authenticated user's profile.
   */
  @Get("/")
  @SuccessResponse(200, "Profile fetched")
  @Response<ErrorResponse>(401, "Unauthenticated")
  async getProfile(@Request() request: ExpressRequest): Promise<UserPublic> {
    return getUserProfile(request.user!.sub);
  }

  /**
   * Update the currently authenticated user's profile.
   * Only the fields you include will be changed (partial PATCH semantics).
   */
  @Patch("/")
  @SuccessResponse(200, "Profile updated")
  @Response<ErrorResponse>(400, "Validation error")
  @Response<ErrorResponse>(401, "Unauthenticated")
  async updateProfile(
    @Request() request: ExpressRequest,
    @Body() body: ProfileUpdateRequest
  ): Promise<ProfileUpdateResponse> {
    const user = await updateUserProfile(request.user!.sub, body);
    return { user };
  }
}
