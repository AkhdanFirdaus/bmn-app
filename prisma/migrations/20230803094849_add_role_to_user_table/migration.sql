/*
  Warnings:

  - You are about to drop the column `phone_number` on the `User` table. All the data in the column will be lost.
  - Added the required column `phoneNumber` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RiwayatPenggunaan" ADD COLUMN     "keterangan" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "phone_number",
ADD COLUMN     "phoneNumber" TEXT NOT NULL,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';
