import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { notFound } from "../../utils/AppError";

// User management is ADMIN-only: this is how "solamente usuarios
// autorizados puedan administrar cámaras" is enforced at the account level.
export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole("ADMIN"));

const userSelect = { id: true, email: true, name: true, role: true, active: true, createdAt: true } as const;

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await prisma.user.findMany({ select: userSelect, orderBy: { createdAt: "asc" } }));
  })
);

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).default("VIEWER"),
});

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { email: data.email.toLowerCase(), passwordHash, name: data.name, role: data.role },
      select: userSelect,
    });
    res.status(201).json(user);
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

usersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const { password, ...rest } = data;
    const user = await prisma.user
      .update({
        where: { id: req.params.id },
        data: { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
        select: userSelect,
      })
      .catch(() => null);
    if (!user) throw notFound("Usuario");
    res.json(user);
  })
);
