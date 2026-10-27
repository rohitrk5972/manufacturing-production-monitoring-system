import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Known Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      message: err.message,
      details: err.details,
    });
    return;
  }

  // PostgreSQL Unique Constraint Violation (Error 23505)
  if (err.code === '23505') {
    if (err.constraint === 'uq_line_date_shift') {
      res.status(409).json({
        error: 'Record Already Exists',
        message: 'A production record already exists for this production line, date, and shift. Only one record per line/date/shift is allowed.',
        constraint: err.constraint,
      });
      return;
    }

    res.status(409).json({
      error: 'Conflict Error',
      message: err.detail || 'Unique constraint violation occurred.',
      constraint: err.constraint,
    });
    return;
  }

  // PostgreSQL Check Violation / Custom Trigger Exception (Error 23514)
  if (err.code === '23514') {
    res.status(409).json({
      error: 'Business Rule Violation',
      message: err.message,
    });
    return;
  }

  // PostgreSQL Foreign Key Violation (Error 23503)
  if (err.code === '23503') {
    if (err.constraint === 'fk_line_product') {
      res.status(400).json({
        error: 'Invalid Line-Product Mapping',
        message: 'The selected product is not configured or permitted for this production line.',
      });
      return;
    }

    if (err.constraint === 'fk_line_daily_product') {
      res.status(409).json({
        error: 'Daily Product Allocation Mismatch',
        message: 'This line is already allocated to a different product on this date. Only one product per line per day is permitted.',
      });
      return;
    }

    res.status(400).json({
      error: 'Foreign Key Constraint Violation',
      message: err.detail || 'Referenced entity does not exist.',
    });
    return;
  }

  // Catch-all
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
};
