import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../config/env";
import { forbidden, unauthorized } from "../utils/AppError";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw unauthorized("Falta el token de autenticación");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    throw unauthorized("Token inválido o expirado");
  }
}

/** Restricts a route to one or more roles. Call after requireAuth. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw unauthorized();
    }
    if (!roles.includes(req.user.role)) {
      throw forbidden();
    }
    next();
  };
}
