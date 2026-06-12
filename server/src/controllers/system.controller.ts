import { Controller, Get, Route, Tags } from 'tsoa';

import { ApiResponse, successResponse } from '../utils/response.util';

interface PingResponse {
  message: string;
  time: Date;
}

@Route('')
@Tags('System')
export class SystemController extends Controller {
  @Get('/')
  public async getWelcome(): Promise<ApiResponse<null>> {
    return successResponse('Welcome to the nexTask API!', null);
  }

  @Get('ping')
  public async getPing(): Promise<PingResponse> {
    return {
      message: 'pong',
      time: new Date(),
    };
  }

  @Get('health')
  public async getHealth(): Promise<ApiResponse<{ time: Date }>> {
    return successResponse('Server is healthy.', { time: new Date() });
  }
}
