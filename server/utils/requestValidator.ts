import { Request, Response } from "express";
import { z } from "zod";

/**
 * Ensures an error is a proper Error object.
 * @param error The unknown error to handle.
 * @returns An Error object.
 */
export function handleError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Validates the request body against a Zod schema.
 * @param schema The Zod schema to validate against.
 * @param req The Express request object.
 * @param res The Express response object.
 * @returns A success object with parsed data, or a failure object.
 */
export function validateRequest<T>(
  schema: z.ZodType<T>,
  req: Request,
  res: Response
): { success: true; data: T } | { success: false } {
  try {
    const data = schema.parse(req.body);
    return { success: true, data };
  } catch (error) {
    const typedError = handleError(error);
    res.status(400).json({
      message: "Invalid request data",
      error: typedError.message,
    });
    return { success: false };
  }
}