import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError, ZodIssue } from 'zod';

export const validateRequest = (schema: ZodTypeAny) => {
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
        return res.status(400).json({
          success: false,
          message: "Data validation failed",
          // Use .issues and explicitly type the 'issue' variable
          errors: error.issues.map((issue: ZodIssue) => ({
            field: issue.path.map(String).join('.'),
            message: issue.message
          }))
        });
      }
      return next(error);
    }
  };
};