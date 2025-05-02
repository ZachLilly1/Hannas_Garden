import { Request, Response, NextFunction } from 'express';
import * as logger from '../services/logger';

// Error codes for common error types
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Input validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Service errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  
  // General errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  BAD_REQUEST = 'BAD_REQUEST'
}

// Interface for API error response structure
export interface ApiErrorResponse {
  error: string;
  message: string;
  code: string;
  details?: Record<string, any>;
  status: number;
}

/**
 * Standardized API error handler
 * Creates a consistent error response format for all API endpoints
 */
export function apiError(
  res: Response,
  {
    status = 500,
    code = ErrorCode.INTERNAL_SERVER_ERROR,
    message = 'An unexpected error occurred',
    error = 'Internal Server Error',
    details
  }: Partial<ApiErrorResponse>
): Response {
  return res.status(status).json({
    error,
    message,
    code,
    ...(details && { details })
  });
}

/**
 * Global error handling middleware for Express
 */
export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction): Response {
  // Log the error
  logger.error('Unhandled error in request:', err);
  
  // Check for specific error types and provide appropriate responses
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return apiError(res, {
      status: 400,
      error: 'Validation Error',
      message: err.message || 'Invalid input data',
      code: ErrorCode.VALIDATION_ERROR,
      details: err.errors || err.issues
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return apiError(res, {
      status: 401,
      error: 'Authentication Required',
      message: 'You must be logged in to access this resource',
      code: ErrorCode.UNAUTHORIZED
    });
  }
  
  if (err.name === 'ForbiddenError') {
    return apiError(res, {
      status: 403,
      error: 'Access Denied',
      message: 'You do not have permission to access this resource',
      code: ErrorCode.FORBIDDEN
    });
  }
  
  if (err.name === 'NotFoundError') {
    return apiError(res, {
      status: 404,
      error: 'Resource Not Found',
      message: err.message || 'The requested resource could not be found',
      code: ErrorCode.NOT_FOUND
    });
  }
  
  if (err.code === 'P2002') {
    // Prisma unique constraint violation
    return apiError(res, {
      status: 409,
      error: 'Resource Conflict',
      message: 'A resource with this identifier already exists',
      code: ErrorCode.CONFLICT
    });
  }
  
  // Handle database errors
  if (err.code && err.code.startsWith('P')) {
    return apiError(res, {
      status: 500,
      error: 'Database Error',
      message: 'A database error occurred',
      code: ErrorCode.DATABASE_ERROR,
      details: { databaseError: err.message }
    });
  }
  
  // Default is a 500 internal server error
  return apiError(res, {
    status: 500,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message || 'Unknown error',
    code: ErrorCode.INTERNAL_SERVER_ERROR
  });
}

/**
 * Wraps an async route handler with error handling
 * This eliminates the need for try/catch blocks in each route
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};