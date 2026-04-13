import { Body, Controller, Post, Route, SuccessResponse } from 'tsoa';

import { AuthData, AuthService, LoginRequest, RegisterRequest } from '../services/auth.service';
import { ApiResponse, successResponse } from '../utils/response.util';

@Route('auth')
export class AuthController extends Controller {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService();
  }

  @SuccessResponse('201', 'Created')
  @Post('register')
  public async register(@Body() requestBody: RegisterRequest): Promise<ApiResponse<AuthData>> {
    this.setStatus(201);
    const data = await this.authService.register(requestBody);
    return successResponse('User registered successfully.', data);
  }

  @SuccessResponse('200', 'OK')
  @Post('login')
  public async login(@Body() requestBody: LoginRequest): Promise<ApiResponse<AuthData>> {
    this.setStatus(200);
    const data = await this.authService.login(requestBody);
    return successResponse('Login successful.', data);
  }
}
