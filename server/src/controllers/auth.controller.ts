import {
  LoginRequest,
  LoginResponseWrapper,
  PasswordResetRequest as ResetPasswordRequest,
} from '@nextask/types';
import type { Request as ExRequest } from 'express';
import { Body, Controller, Post, Request, Route, Security, SuccessResponse, Tags } from 'tsoa';

import { AuthService } from '../services/auth.service';
import { successResponse } from '../utils/response.util';

@Route('auth')
@Tags('Auth')
export class AuthController extends Controller {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService();
  }

  @SuccessResponse('200', 'OK')
  @Post('login')
  public async login(@Body() requestBody: LoginRequest): Promise<LoginResponseWrapper> {
    this.setStatus(200);
    const data = await this.authService.login(requestBody);
    return successResponse('Login successful.', data);
  }

  /**
   * First-login password reset (and any subsequent voluntary reset).
   * Requires a valid JWT — users with mustResetPassword=true are ONLY
   * allowed to call this endpoint until they complete the reset.
   */
  @SuccessResponse('200', 'OK')
  @Security('jwt')
  @Post('reset-password')
  public async resetPassword(
    @Body() requestBody: ResetPasswordRequest,
    @Request() request: ExRequest,
  ): Promise<LoginResponseWrapper> {
    this.setStatus(200);
    const { userId } = (request as any).user;
    const data = await this.authService.resetPassword(userId, requestBody);
    return successResponse('Password reset successfully.', data);
  }
}
