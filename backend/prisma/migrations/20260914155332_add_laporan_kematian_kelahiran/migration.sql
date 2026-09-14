-- CreateEnum
CREATE TYPE "jenis_kelamin" AS ENUM ('JANTAN', 'BETINA');

-- CreateEnum
CREATE TYPE "status_ternak" AS ENUM ('HIDUP', 'MATI');

-- AlterTable
ALTER TABLE "goat" ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "jenis_kelamin" "jenis_kelamin",
ADD COLUMN     "ras_rumpun" TEXT,
ADD COLUMN     "status" "status_ternak" NOT NULL DEFAULT 'HIDUP';

-- CreateTable
CREATE TABLE "penyebab_kematian" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "penyebab_kematian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_kematian" (
    "id" TEXT NOT NULL,
    "goat_id" TEXT NOT NULL,
    "penyebab_kematian_id" TEXT NOT NULL,
    "petugas_id" TEXT NOT NULL,
    "tanggal_kematian" DATE NOT NULL,
    "catatan" TEXT,
    "nomor_berita_acara" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_kematian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_kelahiran" (
    "id" TEXT NOT NULL,
    "goat_id" TEXT NOT NULL,
    "petugas_id" TEXT NOT NULL,
    "petugas_nama" TEXT NOT NULL,
    "tanggal_lahir" DATE NOT NULL,
    "catatan" TEXT,
    "nomor_akta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_kelahiran_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "penyebab_kematian_nama_key" ON "penyebab_kematian"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "laporan_kelahiran_goat_id_key" ON "laporan_kelahiran"("goat_id");

-- AddForeignKey
ALTER TABLE "laporan_kematian" ADD CONSTRAINT "laporan_kematian_goat_id_fkey" FOREIGN KEY ("goat_id") REFERENCES "goat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_kematian" ADD CONSTRAINT "laporan_kematian_penyebab_kematian_id_fkey" FOREIGN KEY ("penyebab_kematian_id") REFERENCES "penyebab_kematian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_kelahiran" ADD CONSTRAINT "laporan_kelahiran_goat_id_fkey" FOREIGN KEY ("goat_id") REFERENCES "goat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
