import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodType } from 'zod';

import { errorResponse } from '../utils/response.util';

export const validateRequest = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Hand the incoming request to Zod for inspection (and apply any transforms/defaults)
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed && typeof parsed === 'object') {
        if ('body' in parsed) req.body = (parsed as any).body;

        if ('query' in parsed && parsed.query) {
          for (const key of Object.keys(req.query)) {
            delete req.query[key];
          }
          Object.assign(req.query, parsed.query);
        }

        if ('params' in parsed && parsed.params) {
          for (const key of Object.keys(req.params)) {
            delete req.params[key];
          }
          Object.assign(req.params, parsed.params);
        }
      }

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
        return res.status(422).json(errorResponse('Data validation failed', mappedErrors));
      }
      return next(error);
    }
  };
};
