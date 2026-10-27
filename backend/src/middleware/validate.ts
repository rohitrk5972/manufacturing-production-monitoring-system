import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fields = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        const message = fields[0]?.message || 'Validation Error';
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message,
            fields,
          },
          message,
          details: fields,
        });
        return;
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fields = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        const message = fields[0]?.message || 'Query Validation Error';
        res.status(400).json({
          error: {
            code: 'QUERY_VALIDATION_ERROR',
            message,
            fields,
          },
          message,
          details: fields,
        });
        return;
      }
      next(error);
    }
  };
};
