import type { Request as ExRequest } from 'express';
import {
  Body,
  Controller,
  Get,
  Middlewares,
  Patch,
  Post,
  Query,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import { validateRequest } from '../middlewares/validate.middleware';
import { userAutocompleteQuerySchema } from '../schemas/user.schema';
import {
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserProfile,
  UserService,
} from '../services/user.service';
import { ApiResponse, successResponse } from '../utils/response.util';

@Route('users')
@Tags('Users')
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
  @Get('search')
  @Middlewares(validateRequest(userAutocompleteQuerySchema))
  @Security('jwt', ['project:member'])
  public async getUserAutocomplete(
    @Query() projectId: string,
    @Query('q') q: string,
  ): Promise<ApiResponse<any[]>> {
    if (!q || q.trim() === '') {
      return successResponse('Search term empty.', []);
    }

    const users = await this.userService.searchUsersAutocomplete(projectId, q);
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
