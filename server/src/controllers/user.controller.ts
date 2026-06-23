import {
  ProjectListResponse,
  UserActivityListResponse,
  UserCreateResponse,
  UserListResponse,
  UserProfileResponse,
  VoidResponse,
} from '@nextask/types';
import type { Request as ExRequest } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Middlewares,
  Patch,
  Path,
  Post,
  Put,
  Query,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import { validateRequest } from '../middlewares/validate.middleware';
import {
  createUserSchema,
  deleteUserSchema,
  getUserActivitySchema,
  getUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userAutocompleteQuerySchema,
} from '../schemas/user.schema';
import {
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserService,
} from '../services/user.service';
import { successResponse } from '../utils/response.util';

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
  @Security('jwt', ['project:manager'])
  public async getUserAutocomplete(
    @Query() projectId: string,
    @Query('q') q: string,
  ): Promise<UserListResponse> {
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
  public async getMe(@Request() request: ExRequest): Promise<UserProfileResponse> {
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
  ): Promise<UserProfileResponse> {
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
  ): Promise<VoidResponse> {
    const { userId } = (request as any).user;
    await this.userService.changePassword(userId, requestBody);
    return successResponse('Password changed successfully.', null);
  }

  /**
   * Returns a list of projects the authenticated user belongs to.
   */
  @SuccessResponse('200', 'OK')
  @Get('me/projects')
  public async getMyProjects(@Request() request: ExRequest): Promise<ProjectListResponse> {
    const { userId } = (request as any).user;
    const projects = await this.userService.getUserProjects(userId);
    return successResponse('Projects retrieved successfully.', projects);
  }

  /**
   * View all users with pagination and search (Admin Only)
   */
  @Get('/')
  @Middlewares(validateRequest(listUsersQuerySchema))
  @Security('jwt', ['global:admin'])
  public async listUsers(
    @Request() request: ExRequest,
    @Query() page: number = 1,
    @Query() limit: number = 10,
    @Query() search?: string,
  ): Promise<UserListResponse> {
    const result = await this.userService.listUsers(page, limit, search);
    return successResponse('Users list retrieved successfully.', result);
  }

  /**
   * Create a new user with generated temporary password (Admin Only)
   */
  @Post('/')
  @Middlewares(validateRequest(createUserSchema))
  @SuccessResponse('201', 'Created')
  @Security('jwt', ['global:admin'])
  public async createUser(
    @Body() requestBody: AdminCreateUserRequest,
    @Request() request: ExRequest,
  ): Promise<UserCreateResponse> {
    const { userId: actorId } = (request as any).user;
    const result = await this.userService.createUser(requestBody, actorId);
    this.setStatus(201);
    return successResponse('User created successfully.', result);
  }

  /**
   * View single user details (Admin Only)
   */
  @Get('{id}')
  @Middlewares(validateRequest(getUserSchema))
  @Security('jwt', ['global:admin'])
  public async getUserById(@Path() id: string): Promise<UserProfileResponse> {
    const profile = await this.userService.getProfile(id);
    return successResponse('User details retrieved successfully.', profile);
  }

  /**
   * Update user details like email, name, and role (Admin Only)
   */
  @Put('{id}')
  @Middlewares(validateRequest(updateUserSchema))
  @Security('jwt', ['global:admin'])
  public async updateUser(
    @Path() id: string,
    @Body() requestBody: AdminUpdateUserRequest,
    @Request() request: ExRequest,
  ): Promise<UserProfileResponse> {
    const { userId: actorId } = (request as any).user;
    const result = await this.userService.updateUser(id, requestBody, actorId);
    return successResponse('User updated successfully.', result);
  }

  /**
   * Deactivate a user (Admin Only)
   */
  @Patch('{id}/deactivate')
  @Middlewares(validateRequest(getUserSchema))
  @Security('jwt', ['global:admin'])
  public async deactivateUser(
    @Path() id: string,
    @Request() request: ExRequest,
  ): Promise<UserProfileResponse> {
    const { userId: actorId } = (request as any).user;
    const result = await this.userService.deactivateUser(id, actorId);
    return successResponse('User deactivated successfully.', result);
  }

  /**
   * Activate a user (Admin Only)
   */
  @Patch('{id}/activate')
  @Middlewares(validateRequest(getUserSchema))
  @Security('jwt', ['global:admin'])
  public async activateUser(
    @Path() id: string,
    @Request() request: ExRequest,
  ): Promise<UserProfileResponse> {
    const { userId: actorId } = (request as any).user;
    const result = await this.userService.activateUser(id, actorId);
    return successResponse('User activated successfully.', result);
  }

  /**
   * Delete a user cleanly (Admin Only)
   */
  @Delete('{id}')
  @Middlewares(validateRequest(deleteUserSchema))
  @Security('jwt', ['global:admin'])
  public async deleteUser(
    @Path() id: string,
    @Request() request: ExRequest,
  ): Promise<VoidResponse> {
    const { userId: actorId } = (request as any).user;
    await this.userService.deleteUser(id, actorId);
    return successResponse('User deleted successfully.', null);
  }

  /**
   * View user action audit logs (Admin Only)
   */
  @Get('{id}/activity')
  @Middlewares(validateRequest(getUserActivitySchema))
  @Security('jwt', ['global:admin'])
  public async getUserActivity(@Path() id: string): Promise<UserActivityListResponse> {
    const logs = await this.userService.getUserActivity(id);
    return successResponse('User activity audit logs retrieved successfully.', logs);
  }
}
