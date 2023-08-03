const db = require('./db');

async function getJumlahData({callback}) {
  const jumlahData = {
    jumlah_kendaraan: await db.kendaraan.count(),
    jumlah_tersedia: await db.kendaraan.count({
      where: {
        OR: [
          {pemakai: null},
          {pemakai: ''},
          {pemakai: '-'},
        ]
      },
    }),
    jumlah_laporan: await db.laporan.count(),
  };
  callback(jumlahData);
}

async function getLaporanSummary({callback}) {
  const laporanSummary = await db.laporan.findMany({
    include: {
      kendaraan: true,
      pelapor: true,
    }
  });

  const data = {
    laporan: laporanSummary,
    jumlah_laporan: laporanSummary.length,
    jumlah_pelapor: 0,
    jumlah_masalah: 0,
    rata_kondisi: 'Baik',
  };
  callback(data);
}

module.exports = {
  getJumlahData,
  getLaporanSummary,
};