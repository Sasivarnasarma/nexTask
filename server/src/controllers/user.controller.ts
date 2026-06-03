import type { Request as ExRequest } from 'express';
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  Route,
  Security,
  SuccessResponse,
} from 'tsoa';

import {
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserProfile,
  UserService,
} from '../services/user.service';
import { ApiResponse, successResponse } from '../utils/response.util';

@Route('users')
@Security('jwt')
export class UserController extends Controller {
  private userService: UserService;

  constructor() {
    super();
    this.userService = new UserService();
  }

  /**
   * Returns the authenticated user's profile.
   */
  @SuccessResponse('200', 'OK')
  @Get('me')
  public async getMe(@Request() request: ExRequest): Promise<ApiResponse<UserProfile>> {
    const { userId } = (request as any).user;
    const profile = await this.userService.getProfile(userId);
    return successResponse('Profile retrieved successfully.', profile);
  }

  /**
   * Updates the authenticated user's name and/or email.
   */
  @SuccessResponse('200', 'OK')
  @Patch('me')
  public async updateMe(
    @Body() requestBody: UpdateProfileRequest,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<UserProfile>> {
    const { userId } = (request as any).user;
    const profile = await this.userService.updateProfile(userId, requestBody);
    return successResponse('Profile updated successfully.', profile);
  }

  /**
   * Allows an authenticated, onboarded user to change their password voluntarily.
   * (First-login forced reset uses POST /auth/reset-password instead.)
   */
  @SuccessResponse('200', 'OK')
  @Post('me/change-password')
  public async changePassword(
    @Body() requestBody: ChangePasswordRequest,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { userId } = (request as any).user;
    await this.userService.changePassword(userId, requestBody);
    return successResponse('Password changed successfully.', null);
  }
}
