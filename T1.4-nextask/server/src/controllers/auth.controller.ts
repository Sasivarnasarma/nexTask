// server/src/controllers/auth.controller.ts
import {
  Body,
  Controller,
  Post,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "@tsoa/runtime";
import { Request as ExpressRequest } from "express";
import {
  LoginRequest,
  LoginResponse,
  PasswordResetRequest,
  PasswordResetResponse,
} from "@nextask/types";
import { loginUser, forceResetPassword } from "../services/auth.service";

// ─── Response Models ──────────────────────────────────────────────────────────

interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Route("auth")
@Tags("Authentication")
export class AuthController extends Controller {
  /**
   * Authenticate a user and receive a JWT.
   *
   * If `mustResetPassword` is `true` in the response the client MUST
   * redirect the user to the password reset screen before allowing any
   * other navigation.
   */
  @Post("login")
  @SuccessResponse(200, "Login successful")
  @Response<ErrorResponse>(400, "Validation error")
  @Response<ErrorResponse>(401, "Invalid credentials")
  async login(@Body() body: LoginRequest): Promise<LoginResponse> {
    return loginUser(body.email, body.password);
  }

  /**
   * Force-reset password (first-login flow).
   *
   * Requires a valid Bearer token. After a successful reset the flag
   * `mustResetPassword` is cleared and a NEW token is returned – the
   * client should replace the stored token immediately so subsequent
   * requests are no longer blocked.
   */
  @Post("password-reset")
  @Security("BearerAuth")
  @SuccessResponse(200, "Password reset successful")
  @Response<ErrorResponse>(400, "Validation / policy error")
  @Response<ErrorResponse>(401, "Unauthenticated or wrong current password")
  @Response<ErrorResponse>(422, "Password does not meet complexity requirements")
  async resetPassword(
    @Request() request: ExpressRequest,
    @Body() body: PasswordResetRequest
  ): Promise<PasswordResetResponse & LoginResponse> {
    const userId = request.user!.sub;
    return forceResetPassword(
      userId,
      body.currentPassword,
      body.newPassword,
      body.confirmPassword
    );
  }
}
