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

module.exports = {
  getJumlahData,
};