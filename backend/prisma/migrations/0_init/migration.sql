-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."RecordingSource" AS ENUM ('WA', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."RecordingStatus" AS ENUM ('PERLU_REVIEW', 'FINAL');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'SUPERADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."goat_condition" AS ENUM ('SEHAT', 'SAKIT');

-- CreateEnum
CREATE TYPE "public"."sold_status" AS ENUM ('YA', 'TIDAK');

-- CreateTable
CREATE TABLE "public"."admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'ADMIN',
    "googleId" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_message" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."farmer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp_phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "desa" TEXT NOT NULL DEFAULT 'Besuki',
    "rt" TEXT NOT NULL DEFAULT '-',
    "rw" TEXT NOT NULL DEFAULT '-',
    "dusun" TEXT NOT NULL DEFAULT '-',

    CONSTRAINT "farmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."goat" (
    "id" TEXT NOT NULL,
    "ear_tag_number" INTEGER NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recording" (
    "id" TEXT NOT NULL,
    "goat_id" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "mating_date" DATE,
    "birth_date" DATE,
    "male_kid_count" TEXT NOT NULL DEFAULT '-',
    "female_kid_count" TEXT NOT NULL DEFAULT '-',
    "mating_number" TEXT NOT NULL DEFAULT '-',
    "sale_target" TEXT NOT NULL DEFAULT '-',
    "sold" "public"."sold_status",
    "notes" TEXT NOT NULL DEFAULT '-',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photo_url" TEXT,
    "source" "public"."RecordingSource" NOT NULL DEFAULT 'WA',
    "status" "public"."RecordingStatus" NOT NULL DEFAULT 'PERLU_REVIEW',
    "photo_public_id" TEXT,
    "recording_date" DATE NOT NULL,
    "condition" "public"."goat_condition",

    CONSTRAINT "recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session" (
    "phone" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("phone")
);

-- CreateTable
CREATE TABLE "public"."sync_status" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "lastSyncAt" TIMESTAMP(3),
    "lastStatus" TEXT NOT NULL DEFAULT 'BELUM_PERNAH',
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_key" ON "public"."admin"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_googleId_key" ON "public"."admin"("googleId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_username_key" ON "public"."admin"("username" ASC);

-- CreateIndex
CREATE INDEX "chat_message_phone_createdAt_idx" ON "public"."chat_message"("phone" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "farmer_whatsapp_phone_key" ON "public"."farmer"("whatsapp_phone" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "goat_ear_tag_number_key" ON "public"."goat"("ear_tag_number" ASC);

-- CreateIndex
CREATE INDEX "goat_farmer_id_idx" ON "public"."goat"("farmer_id" ASC);

-- CreateIndex
CREATE INDEX "recording_createdAt_idx" ON "public"."recording"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "recording_goat_id_idx" ON "public"."recording"("goat_id" ASC);

-- CreateIndex
CREATE INDEX "recording_status_idx" ON "public"."recording"("status" ASC);

-- AddForeignKey
ALTER TABLE "public"."goat" ADD CONSTRAINT "goat_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recording" ADD CONSTRAINT "recording_goat_id_fkey" FOREIGN KEY ("goat_id") REFERENCES "public"."goat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

