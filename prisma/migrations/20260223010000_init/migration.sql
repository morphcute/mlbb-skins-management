-- Create enums
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPPLIER', 'VIEWER');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'READY_FOR_GIFTING', 'COMPLETED', 'FAILED');

-- Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SUPPLIER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Suppliers
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diamond_balance" INTEGER NOT NULL DEFAULT 0,
    "low_balance_threshold" INTEGER NOT NULL DEFAULT 1000,
    "google_sheet_id" TEXT,
    "google_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "suppliers_user_id_key" ON "suppliers"("user_id");

-- Orders
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "mlbb_id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "ign" TEXT NOT NULL,
    "skin_name" TEXT NOT NULL,
    "diamond_price" INTEGER NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "ready_for_gifting" BOOLEAN NOT NULL DEFAULT false,
    "assigned_by" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "balance_deducted_at" TIMESTAMP(3),
    "google_sheet_row_number" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "orders_supplier_id_status_idx" ON "orders"("supplier_id", "status");
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- Balance logs
CREATE TABLE "balance_logs" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "change_amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "balance_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "balance_logs_supplier_id_created_at_idx" ON "balance_logs"("supplier_id", "created_at");

-- Foreign keys
ALTER TABLE "suppliers"
ADD CONSTRAINT "suppliers_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders"
ADD CONSTRAINT "orders_supplier_id_fkey"
FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders"
ADD CONSTRAINT "orders_assigned_by_fkey"
FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "balance_logs"
ADD CONSTRAINT "balance_logs_supplier_id_fkey"
FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "balance_logs"
ADD CONSTRAINT "balance_logs_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
