import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodType } from 'zod';

import { errorResponse } from '../utils/response.util';

export const validateRequest = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Hand the incoming request to Zod for inspection
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // 2. If Zod approves, move to the next function
      return next();
    } catch (error) {
      // 3. If Zod rejects, catch the error and send a 400 Bad Request
      if (error instanceof ZodError) {
        const mappedErrors: Record<string, string> = {};
        for (const issue of error.issues) {
          const fieldName = issue.path.map(String).join('.') || 'global';
          mappedErrors[fieldName] = issue.message;
        }
        return res.status(400).json(errorResponse('Data validation failed', mappedErrors));
      }
      return next(error);
    }
  };
};
