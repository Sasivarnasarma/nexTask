import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

import { RegisterRoutes } from './routes';
import swaggerDocument from './swagger.json';
import { ApiError } from './utils/apiError.util';
import { errorResponse, successResponse } from './utils/response.util';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

RegisterRoutes(app);

app.get('/', (req: Request, res: Response) => {
  res.json(successResponse('Welcome to the nexTask API!', null));
});

app.get('/health', (req: Request, res: Response) => {
  res.json(successResponse('Server is healthy.', { time: new Date() }));
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(errorResponse(err.message));
  }

  if (
    err &&
    typeof err === 'object' &&
    'name' in err &&
    err.name === 'ValidateError' &&
    'fields' in err
  ) {
    return res.status(422).json({
      status: 'error',
      message: 'Request validation failed.',
      data: (err as { fields: Record<string, unknown> }).fields,
      error: 'VALIDATION_ERROR',
    });
  }

  const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
  return res.status(500).json(errorResponse(message));
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

export default app;
