import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { signToken, requireAuth } from "../../middleware/auth";
import { unauthorized } from "../../utils/AppError";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active) {
      throw unauthorized("Credenciales inválidas");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw unauthorized("Credenciales inválidas");
    }

    const authUser = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = signToken(authUser);
    res.json({ token, user: authUser });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);
