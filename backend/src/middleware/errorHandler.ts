import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 400, details?: any, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.code =
      code ||
      (statusCode === 404
        ? 'NOT_FOUND'
        : statusCode === 409
        ? 'CONFLICT_ERROR'
        : statusCode >= 500
        ? 'INTERNAL_SERVER_ERROR'
        : 'BAD_REQUEST');
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
      error: {
        code: err.code,
        message: err.message,
        fields: err.details || null,
      },
      message: err.message,
      details: err.details,
    });
    return;
  }

  // PostgreSQL Unique Constraint Violation (Error 23505)
  if (err.code === '23505') {
    const isShiftConflict = err.constraint === 'uq_line_date_shift';
    const message = isShiftConflict
      ? 'A production record already exists for this production line, date, and shift. Only one record per line/date/shift is allowed.'
      : err.detail || 'Unique constraint violation occurred.';

    res.status(409).json({
      error: {
        code: isShiftConflict ? 'DUPLICATE_SHIFT_RECORD' : 'CONFLICT_UNIQUE',
        message,
        fields: err.constraint ? [{ field: err.constraint, message: 'Duplicate value violates unique constraint' }] : null,
      },
      message,
      constraint: err.constraint,
    });
    return;
  }

  // PostgreSQL Check Violation / Custom Trigger Exception (Error 23514)
  if (err.code === '23514') {
    res.status(409).json({
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: err.message,
        fields: null,
      },
      message: err.message,
    });
    return;
  }

  // PostgreSQL Foreign Key Violation (Error 23503)
  if (err.code === '23503') {
    if (err.constraint === 'fk_line_product') {
      const message = 'The selected product is not configured or permitted for this production line.';
      res.status(400).json({
        error: {
          code: 'INCOMPATIBLE_LINE_PRODUCT',
          message,
          fields: [{ field: 'product_id', message: 'Product is incompatible with selected production line' }],
        },
        message,
      });
      return;
    }

    if (err.constraint === 'fk_line_daily_product') {
      const message = 'This line is already allocated to a different product on this date. Only one product per line per day is permitted.';
      res.status(409).json({
        error: {
          code: 'DAILY_ALLOCATION_MISMATCH',
          message,
          fields: [{ field: 'product_id', message: 'Line is locked to a different product on this date' }],
        },
        message,
      });
      return;
    }

    const message = err.detail || 'Referenced entity does not exist.';
    res.status(400).json({
      error: {
        code: 'FOREIGN_KEY_VIOLATION',
        message,
        fields: err.constraint ? [{ field: err.constraint, message: 'Referenced foreign entity does not exist' }] : null,
      },
      message,
    });
    return;
  }

  // Catch-all
  console.error('Unhandled server error:', err);
  const message = process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message;
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      fields: null,
    },
    message,
  });
};
