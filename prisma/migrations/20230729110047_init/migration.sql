-- CreateTable
CREATE TABLE "Kendaraan" (
    "id" SERIAL NOT NULL,
    "kodeSatker" TEXT NOT NULL,
    "namaSatker" TEXT NOT NULL,
    "kodeBarang" TEXT NOT NULL,
    "namaBarang" TEXT NOT NULL,
    "nup" INTEGER,
    "kondisi" INTEGER NOT NULL DEFAULT 0,
    "merk" TEXT,
    "tglRekamPertama" TEXT,
    "tglPerolehan" TEXT,
    "nilaiPerolehanPertama" INTEGER NOT NULL DEFAULT 0,
    "nilaiMutasi" INTEGER NOT NULL DEFAULT 0,
    "nilaiPerolehan" INTEGER NOT NULL DEFAULT 0,
    "nilaiPenyusutan" INTEGER NOT NULL DEFAULT 0,
    "nilaiBuku" INTEGER NOT NULL DEFAULT 0,
    "kuantitas" INTEGER NOT NULL DEFAULT 1,
    "jmlFoto" INTEGER NOT NULL DEFAULT 0,
    "statusPenggunaan" INTEGER NOT NULL DEFAULT 0,
    "statusPengelolaan" TEXT,
    "noPsp" TEXT,
    "tglPsp" TEXT,
    "noBpkb" TEXT,
    "noPolisi" TEXT NOT NULL,
    "pemakai" TEXT,
    "jumlahKib" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Kendaraan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laporan" (
    "id" SERIAL NOT NULL,
    "kendaraanId" INTEGER NOT NULL,
    "laporan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Laporan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutputKlasifikasi" (
    "id" SERIAL NOT NULL,
    "laporanId" INTEGER NOT NULL,
    "labelId" INTEGER NOT NULL,

    CONSTRAINT "OutputKlasifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" SERIAL NOT NULL,
    "indeks" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "bobot" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_kendaraanId_fkey" FOREIGN KEY ("kendaraanId") REFERENCES "Kendaraan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputKlasifikasi" ADD CONSTRAINT "OutputKlasifikasi_laporanId_fkey" FOREIGN KEY ("laporanId") REFERENCES "Laporan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputKlasifikasi" ADD CONSTRAINT "OutputKlasifikasi_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
