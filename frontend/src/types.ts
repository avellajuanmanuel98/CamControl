export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";
export type CameraStatus = "ONLINE" | "OFFLINE" | "WARNING" | "UNCONFIGURED";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface SiteStats {
  total: number;
  online: number;
  offline: number;
  warning: number;
  unconfigured: number;
}

export interface Site {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: SiteStats;
}

export interface QrAssetSummary {
  id: string;
  filename: string;
  mimeType: string;
  createdAt: string;
}

export interface Camera {
  id: string;
  serialNumber: string;
  code: string | null;
  cifrado: string | null;
  capacidad: string | null;
  sharedUser: string | null;
  model: string | null;
  observations: string | null;
  ipAddress: string | null;
  hostname: string | null;
  port: number | null;
  ezvizDeviceSerial: string | null;
  status: CameraStatus;
  lastCheckedAt: string | null;
  lastOnlineAt: string | null;
  lastLatencyMs: number | null;
  siteId: string;
  site: { id: string; name: string };
  qrAsset: QrAssetSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface CameraStatusEvent {
  id: string;
  cameraId: string;
  status: CameraStatus;
  source: "EZVIZ_API" | "MANUAL" | "SYSTEM";
  latencyMs: number | null;
  message: string | null;
  checkedAt: string;
}

export interface DashboardCounts {
  ONLINE: number;
  OFFLINE: number;
  WARNING: number;
  UNCONFIGURED: number;
  total: number;
}

export interface DashboardSummary {
  global: DashboardCounts;
  bySite: Array<DashboardCounts & { siteId: string; siteName: string }>;
}

export interface ImportRowOutcome {
  rowNumber: number;
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
  rows: ImportRowOutcome[];
}
