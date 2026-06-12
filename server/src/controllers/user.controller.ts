import type { Request as ExRequest } from 'express';
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
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
   * Returns a list of team members for autocomplete search dropdowns (Task 3.4)
   */
  @SuccessResponse('200', 'OK')
  @Get('search/autocomplete')
  public async getUserAutocomplete(@Query() search: string): Promise<ApiResponse<any[]>> {
    if (!search || search.trim() === '') {
      return successResponse('Search term empty.', []);
    }

    // Now it safely finds searchUsersAutocomplete inside your service class instance!
    const users = await this.userService.searchUsersAutocomplete(search);
    return successResponse('Autocomplete users retrieved successfully.', users);
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
   * Allows an authenticated user to change their password voluntarily.
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

  /**
   * Returns a list of projects the authenticated user belongs to.
   */
  @SuccessResponse('200', 'OK')
  @Get('me/projects')
  public async getMyProjects(@Request() request: ExRequest): Promise<ApiResponse<any[]>> {
    const { userId } = (request as any).user;
    const projects = await this.userService.getUserProjects(userId);
    return successResponse('Projects retrieved successfully.', projects);
  }
}
