import { SystemHealthResponse, VoidResponse } from '@nextask/types';
import { Controller, Get, Route, Tags } from 'tsoa';

import { successResponse } from '../utils/response.util';

interface PingResponse {
  message: string;
  time: Date;
}

@Route('')
@Tags('System')
export class SystemController extends Controller {
  @Get('/')
  public async getWelcome(): Promise<VoidResponse> {
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
  public async getHealth(): Promise<SystemHealthResponse> {
    return successResponse('Server is healthy.', { time: new Date() });
  }
}
