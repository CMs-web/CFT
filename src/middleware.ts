import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { ERROR_MESSAGES, HTTP_STATUS } from './constants';
import { HttpError } from './errors';
import { logger } from './logger';

export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };
}

export const notFoundHandler: RequestHandler = (_req, res): void => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: ERROR_MESSAGES.routeNotFound,
  });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }

  if (isJsonParseError(error)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: ERROR_MESSAGES.invalidJson,
    });
    return;
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, error);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: ERROR_MESSAGES.internalServerError,
  });
};

function isJsonParseError(error: unknown): boolean {
  return error instanceof SyntaxError && 'body' in error;
}
