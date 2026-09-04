-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "CameraStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING', 'UNCONFIGURED');

-- CreateEnum
CREATE TYPE "CheckSource" AS ENUM ('EZVIZ_API', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('NONE', 'EMAIL', 'WHATSAPP', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cameras" (
    "id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "code" TEXT,
    "cifrado" TEXT,
    "capacidad" TEXT,
    "shared_user" TEXT,
    "model" TEXT,
    "observations" TEXT,
    "ip_address" TEXT,
    "hostname" TEXT,
    "port" INTEGER,
    "ezviz_device_serial" TEXT,
    "ezviz_verified_from_qr" BOOLEAN NOT NULL DEFAULT false,
    "site_id" TEXT NOT NULL,
    "status" "CameraStatus" NOT NULL DEFAULT 'UNCONFIGURED',
    "last_checked_at" TIMESTAMP(3),
    "last_online_at" TIMESTAMP(3),
    "last_latency_ms" INTEGER,
    "consecutive_fails" INTEGER NOT NULL DEFAULT 0,
    "qr_asset_id" TEXT,
    "created_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_assets" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "decoded_payload" TEXT,
    "uploaded_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camera_status_events" (
    "id" TEXT NOT NULL,
    "camera_id" TEXT NOT NULL,
    "status" "CameraStatus" NOT NULL,
    "source" "CheckSource" NOT NULL,
    "latency_ms" INTEGER,
    "message" TEXT,
    "raw_response" JSONB,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camera_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ezviz_credentials" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "app_key_ciphertext" TEXT NOT NULL,
    "app_secret_ciphertext" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ezviz_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "threshold_minutes" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "camera_id" TEXT NOT NULL,
    "rule_id" TEXT,
    "message" TEXT NOT NULL,
    "channel" "AlertChannel" NOT NULL DEFAULT 'NONE',
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "created_rows" INTEGER NOT NULL DEFAULT 0,
    "updated_rows" INTEGER NOT NULL DEFAULT 0,
    "skipped_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "imported_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_row_errors" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "raw_data" JSONB NOT NULL,

    CONSTRAINT "import_row_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sites_name_key" ON "sites"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sites_code_key" ON "sites"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cameras_serial_number_key" ON "cameras"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "cameras_qr_asset_id_key" ON "cameras"("qr_asset_id");

-- CreateIndex
CREATE INDEX "cameras_site_id_idx" ON "cameras"("site_id");

-- CreateIndex
CREATE INDEX "cameras_status_idx" ON "cameras"("status");

-- CreateIndex
CREATE INDEX "camera_status_events_camera_id_checked_at_idx" ON "camera_status_events"("camera_id", "checked_at");

-- CreateIndex
CREATE INDEX "alert_events_camera_id_idx" ON "alert_events"("camera_id");

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_qr_asset_id_fkey" FOREIGN KEY ("qr_asset_id") REFERENCES "qr_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_assets" ADD CONSTRAINT "qr_assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_status_events" ADD CONSTRAINT "camera_status_events_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "cameras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "cameras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_row_errors" ADD CONSTRAINT "import_row_errors_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
