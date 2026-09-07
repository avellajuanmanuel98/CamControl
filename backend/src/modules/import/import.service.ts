import * as XLSX from "xlsx";
import { parse as parseCsv } from "csv-parse/sync";
import { CameraStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";

export interface ParsedRow {
  rowNumber: number; // 1-based within its own sheet (header excluded)
  sheetName: string;
  raw: Record<string, unknown>;
}

export interface RowOutcome {
  rowNumber: number;
  sheetName: string;
  action: "create" | "update" | "skip" | "error";
  reason?: string;
  serialNumber?: string;
  siteName?: string;
}

export interface ImportReport {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  // Distinct SEDE/sheet labels that produced a "sede no encontrada" error,
  // in the original casing/spacing from the file — lets the frontend offer
  // "create these sites" instead of a dead-end error.
  unresolvedSiteLabels: string[];
  rows: RowOutcome[];
}

// Normalizes a spreadsheet header so "S/N", "s/n", " S/N " all match the same key.
function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (after NFD normalization)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

const HEADER_ALIASES: Record<string, string> = {
  "S/N": "serialNumber",
  SN: "serialNumber",
  SERIAL: "serialNumber",
  CODIGO: "code",
  "CÓDIGO": "code",
  CIFRADO: "cifrado",
  CAPACIDAD: "capacidad",
  QR: "qr", // ignored on import — loaded manually afterwards
  USER_COMPARTIDOS: "sharedUser",
  USUARIO_COMPARTIDO: "sharedUser",
  ESTADO: "estado",
  SEDE: "sede",
  UBICACION: "sede",
  "UBICACIÓN": "sede",
  MODELO: "model",
  IP: "ipAddress",
  HOSTNAME: "hostname",
  PUERTO: "port",
  OBSERVACIONES: "observations",
};

const ESTADO_TO_STATUS: Record<string, CameraStatus> = {
  ONLINE: "ONLINE",
  ACTIVO: "ONLINE",
  ACTIVA: "ONLINE",
  OFFLINE: "OFFLINE",
  CAIDO: "OFFLINE",
  CAIDA: "OFFLINE",
  INACTIVO: "OFFLINE",
  INACTIVA: "OFFLINE",
};

function normalizeRecord(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const alias = HEADER_ALIASES[normalizeHeader(key)];
    if (!alias) continue;
    if (value === null || value === undefined) {
      normalized[alias] = "";
    } else if (typeof value === "string") {
      normalized[alias] = value.trim();
    } else {
      // Every one of our import columns is a text field in the DB, but a
      // spreadsheet cell that "looks like text" (a capacidad of 128, a
      // cifrado that's all digits, a S/N that's purely numeric) is often
      // stored by Excel as a number — stringify it instead of passing a
      // raw number/boolean/Date straight to Prisma, which used to crash
      // the entire import on that one row.
      normalized[alias] = String(value).trim();
    }
  }
  return normalized;
}

// Reads every sheet in the workbook, not just the first one — real
// inventories are often split across tabs (one per site, "Chile", "Luc",
// etc.), and skipping the rest silently used to drop most of the rows.
export function parseSpreadsheet(buffer: Buffer, filename: string): ParsedRow[] {
  const isCsv = filename.toLowerCase().endsWith(".csv");

  if (isCsv) {
    const records = parseCsv(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<
      string,
      unknown
    >[];
    return records.map((raw, idx) => ({ rowNumber: idx + 1, sheetName: filename, raw: normalizeRecord(raw) }));
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const rows: ParsedRow[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheetRecords = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" }) as Record<
      string,
      unknown
    >[];
    sheetRecords.forEach((raw, idx) => {
      // Skip fully-empty rows (common at the end of a sheet or between
      // blocks) instead of reporting them as "falta S/N" errors.
      const normalized = normalizeRecord(raw);
      const hasAnyValue = Object.values(normalized).some((v) => String(v ?? "").trim() !== "");
      if (hasAnyValue) rows.push({ rowNumber: idx + 1, sheetName, raw: normalized });
    });
  }
  return rows;
}

export interface ImportOptions {
  defaultSiteId?: string;
  duplicateStrategy: "skip" | "update";
  dryRun: boolean;
  importedById?: string;
  filename: string;
}

/**
 * Matches a SEDE value or sheet/tab name to a known site. Tries an exact
 * match first ("Chile" → Chile), then falls back to a prefix match on
 * "<Sede>_algo" / "<Sede>-algo" labels (e.g. a tab named "MEDELLIN_CAL" or
 * "MEDELLIN-CALABAZA" still resolves to the site "Medellín") — common when
 * a spreadsheet splits one site across several tabs by client/batch.
 */
function resolveSite(label: string, siteByNormalizedName: Map<string, string>): string | null {
  const normalized = normalizeHeader(label);
  const exact = siteByNormalizedName.get(normalized);
  if (exact) return exact;

  for (const [siteKey, siteId] of siteByNormalizedName) {
    if (normalized.startsWith(`${siteKey}_`) || normalized.startsWith(`${siteKey}-`)) return siteId;
  }
  return null;
}

export async function runImport(rows: ParsedRow[], options: ImportOptions): Promise<ImportReport> {
  const sites = await prisma.site.findMany({ select: { id: true, name: true } });
  const siteByNormalizedName = new Map(sites.map((s) => [normalizeHeader(s.name), s.id]));

  const outcomes: RowOutcome[] = [];
  const unresolvedSiteLabels = new Set<string>();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const data = row.raw as Record<string, string | undefined>;
    const serialNumber = data.serialNumber?.toString().trim();

    if (!serialNumber) {
      outcomes.push({
        rowNumber: row.rowNumber,
        sheetName: row.sheetName,
        action: "error",
        reason: "Falta S/N (columna obligatoria)",
      });
      errors++;
      continue;
    }

    let siteId = options.defaultSiteId ?? null;
    let siteName: string | undefined;
    if (data.sede) {
      const match = resolveSite(data.sede, siteByNormalizedName);
      if (match) {
        siteId = match;
        siteName = data.sede;
      }
    }
    // No explicit SEDE column value → try the sheet/tab name itself
    // ("Chile", "Funza", "MEDELLIN_CAL", ...), which is how multi-sede
    // spreadsheets are commonly organized (one tab per site, sometimes with
    // a client/batch suffix).
    if (!siteName) {
      const sheetMatch = resolveSite(row.sheetName, siteByNormalizedName);
      if (sheetMatch) {
        siteId = sheetMatch;
        siteName = row.sheetName;
      }
    }
    if (!siteId) {
      const label = data.sede ?? row.sheetName;
      unresolvedSiteLabels.add(label);
      outcomes.push({
        rowNumber: row.rowNumber,
        sheetName: row.sheetName,
        action: "error",
        reason: `Sede "${label}" no encontrada y no se definió una sede por defecto`,
        serialNumber,
      });
      errors++;
      continue;
    }

    // A single malformed row (an unexpected data type, a DB constraint
    // violation, etc.) must never abort the whole batch — it gets reported
    // as an error for that row, and the import keeps going.
    try {
      const existing = await prisma.camera.findFirst({
        where: {
          OR: [{ serialNumber }, ...(data.code ? [{ code: data.code }] : [])],
        },
      });

      const status = data.estado
        ? ESTADO_TO_STATUS[normalizeHeader(data.estado)] ?? "UNCONFIGURED"
        : "UNCONFIGURED";
      const payload = {
        serialNumber,
        code: data.code || null,
        cifrado: data.cifrado || null,
        capacidad: data.capacidad || null,
        sharedUser: data.sharedUser || null,
        model: data.model || null,
        ipAddress: data.ipAddress || null,
        hostname: data.hostname || null,
        observations: data.observations || null,
        port: data.port ? Number(data.port) || null : null,
        status,
        siteId,
        createdById: options.importedById,
      };

      if (existing) {
        if (options.duplicateStrategy === "skip") {
          outcomes.push({
            rowNumber: row.rowNumber,
            sheetName: row.sheetName,
            action: "skip",
            reason: `Ya existe una cámara con ese S/N o código (id ${existing.id})`,
            serialNumber,
            siteName,
          });
          skipped++;
          continue;
        }
        if (!options.dryRun) {
          const statusChanged = existing.status !== status;
          await prisma.camera.update({
            where: { id: existing.id },
            data: { ...payload, ...(statusChanged ? { statusChangedAt: new Date() } : {}) },
          });
        }
        outcomes.push({
          rowNumber: row.rowNumber,
          sheetName: row.sheetName,
          action: "update",
          serialNumber,
          siteName,
        });
        updated++;
        continue;
      }

      if (!options.dryRun) {
        await prisma.camera.create({ data: { ...payload, statusChangedAt: new Date() } });
      }
      outcomes.push({ rowNumber: row.rowNumber, sheetName: row.sheetName, action: "create", serialNumber, siteName });
      created++;
    } catch (err) {
      const message = err instanceof Error ? err.message.split("\n")[0] : "Error desconocido al guardar la fila";
      outcomes.push({
        rowNumber: row.rowNumber,
        sheetName: row.sheetName,
        action: "error",
        reason: message,
        serialNumber,
        siteName,
      });
      errors++;
    }
  }

  if (!options.dryRun) {
    await prisma.importBatch.create({
      data: {
        filename: options.filename,
        status: "COMPLETED",
        totalRows: rows.length,
        createdRows: created,
        updatedRows: updated,
        skippedRows: skipped,
        errorRows: errors,
        importedById: options.importedById,
        rowErrors: {
          create: outcomes
            .filter((o) => o.action === "error")
            .map((o) => ({ rowNumber: o.rowNumber, message: o.reason ?? "Error desconocido", rawData: {} })),
        },
      },
    });
  }

  return {
    totalRows: rows.length,
    created,
    updated,
    skipped,
    errors,
    unresolvedSiteLabels: Array.from(unresolvedSiteLabels),
    rows: outcomes,
  };
}
