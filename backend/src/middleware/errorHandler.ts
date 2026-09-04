import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

/** Wraps async route handlers so rejected promises reach the error middleware. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Datos inválidos",
      details: err.flatten(),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  // Prisma unique constraint violation
  if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
    const target = (err as { meta?: { target?: string[] } }).meta?.target?.join(", ");
    return res.status(409).json({ error: `Ya existe un registro con ese ${target ?? "valor único"}` });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Error interno del servidor" });
}
