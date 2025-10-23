import { Request, Response, NextFunction, RequestHandler } from 'express';

// Small helper to wrap async route handlers and forward errors to express error handler
export const asyncHandler = (fn: RequestHandler) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
