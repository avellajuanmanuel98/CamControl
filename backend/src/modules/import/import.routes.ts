import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { badRequest } from "../../utils/AppError";
import { parseSpreadsheet, runImport } from "./import.service";
import { prisma } from "../../db/prisma";

export const importRouter = Router();
importRouter.use(requireAuth, requireRole("ADMIN", "OPERATOR"));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// multipart/form-data always arrives as strings, so a plain z.coerce.boolean()
// would treat the literal string "false" as truthy (Boolean("false") === true).
// This form recognizes "false"/"0" explicitly instead.
const looseBoolean = z.preprocess((value) => {
  if (typeof value === "string") return !["false", "0", ""].includes(value.toLowerCase());
  return value;
}, z.boolean());

const optionsSchema = z.object({
  defaultSiteId: z.string().uuid().optional(),
  duplicateStrategy: z.enum(["skip", "update"]).default("skip"),
  dryRun: looseBoolean.default(true),
});

importRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("Debes adjuntar un archivo .xlsx o .csv en el campo 'file'");
    const options = optionsSchema.parse(req.body);

    const rows = parseSpreadsheet(req.file.buffer, req.file.originalname);
    if (rows.length === 0) {
      throw badRequest("El archivo no tiene filas de datos o las columnas no fueron reconocidas");
    }

    const report = await runImport(rows, {
      ...options,
      filename: req.file.originalname,
      importedById: req.user!.id,
    });

    res.json(report);
  })
);

importRouter.get(
  "/history",
  asyncHandler(async (_req, res) => {
    const batches = await prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { rowErrors: true, importedBy: { select: { name: true, email: true } } },
    });
    res.json(batches);
  })
);
