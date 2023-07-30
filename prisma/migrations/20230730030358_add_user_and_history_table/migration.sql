/*
  Warnings:

  - Added the required column `pelapor_id` to the `Laporan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Laporan" ADD COLUMN     "pelapor_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "pin" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiwayatPenggunaan" (
    "id" SERIAL NOT NULL,
    "pengguna_id" INTEGER NOT NULL,
    "kendaraan_id" INTEGER NOT NULL,
    "mulai" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selesai" TIMESTAMP(3),

    CONSTRAINT "RiwayatPenggunaan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RiwayatPenggunaan" ADD CONSTRAINT "RiwayatPenggunaan_pengguna_id_fkey" FOREIGN KEY ("pengguna_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiwayatPenggunaan" ADD CONSTRAINT "RiwayatPenggunaan_kendaraan_id_fkey" FOREIGN KEY ("kendaraan_id") REFERENCES "Kendaraan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_pelapor_id_fkey" FOREIGN KEY ("pelapor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
