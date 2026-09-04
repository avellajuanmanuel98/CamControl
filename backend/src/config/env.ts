import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  credentialsEncryptionKey: required("CREDENTIALS_ENCRYPTION_KEY"),
  qrStorageDir: process.env.QR_STORAGE_DIR ?? "./storage/qr",
  monitorIntervalSeconds: parseInt(process.env.MONITOR_INTERVAL_SECONDS ?? "120", 10),
  monitorWarningFailThreshold: parseInt(process.env.MONITOR_WARNING_FAIL_THRESHOLD ?? "2", 10),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@camcontrol.local",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!",
};
