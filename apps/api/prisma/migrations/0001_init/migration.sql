-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "role" AS ENUM ('MANAGER');

-- CreateEnum
CREATE TYPE "vehicle_status" AS ENUM ('IN_STOCK', 'SOLD', 'WHOLESALED');

-- CreateEnum
CREATE TYPE "action_status" AS ENUM ('PRICE_REDUCTION_PLANNED', 'PRICE_REDUCED', 'MARKETING_PUSH', 'TRANSFER_PLANNED', 'SEND_TO_AUCTION', 'RECONDITIONING', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "action_source" AS ENUM ('MANUAL', 'SUGGESTION');

-- CreateEnum
CREATE TYPE "price_change_reason" AS ENUM ('INITIAL', 'PRICE_REDUCED_ACTION', 'MANUAL_EDIT');

-- CreateTable
CREATE TABLE "dealerships" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Saigon',
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "aging_threshold_days" INTEGER NOT NULL DEFAULT 90,
    "stale_action_days" INTEGER NOT NULL DEFAULT 14,
    "daily_holding_cost" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dealerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "dealership_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'MANAGER',
    "password_hash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "dealership_id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "trim" TEXT,
    "color" TEXT,
    "mileage" INTEGER NOT NULL,
    "purchase_cost" DECIMAL(15,2) NOT NULL,
    "list_price" DECIMAL(15,2) NOT NULL,
    "sale_price" DECIMAL(15,2),
    "status" "vehicle_status" NOT NULL DEFAULT 'IN_STOCK',
    "stocked_at" TIMESTAMPTZ(6) NOT NULL,
    "sold_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_actions" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "status" "action_status" NOT NULL,
    "note" VARCHAR(1000),
    "target_date" DATE,
    "new_price" DECIMAL(15,2),
    "source" "action_source" NOT NULL DEFAULT 'MANUAL',
    "suggestion_code" TEXT,
    "bulk_id" TEXT,
    "edited_at" TIMESTAMPTZ(6),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_price_history" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "previous_price" DECIMAL(15,2),
    "reason" "price_change_reason" NOT NULL,
    "action_id" TEXT,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_dealership_id_idx" ON "employees"("dealership_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE INDEX "vehicles_dealership_id_status_stocked_at_idx" ON "vehicles"("dealership_id", "status", "stocked_at");

-- CreateIndex
CREATE INDEX "vehicles_dealership_id_make_model_idx" ON "vehicles"("dealership_id", "make", "model");

-- CreateIndex
CREATE INDEX "vehicle_actions_vehicle_id_created_at_idx" ON "vehicle_actions"("vehicle_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_price_history_action_id_key" ON "vehicle_price_history"("action_id");

-- CreateIndex
CREATE INDEX "vehicle_price_history_vehicle_id_changed_at_idx" ON "vehicle_price_history"("vehicle_id", "changed_at");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_actions" ADD CONSTRAINT "vehicle_actions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_actions" ADD CONSTRAINT "vehicle_actions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_price_history" ADD CONSTRAINT "vehicle_price_history_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_price_history" ADD CONSTRAINT "vehicle_price_history_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "vehicle_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_price_history" ADD CONSTRAINT "vehicle_price_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

