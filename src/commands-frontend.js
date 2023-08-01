const db = require('./db');

async function getJumlahData({callback}) {
  const jumlahData = {
    jumlah_kendaraan: await db.kendaraan.count(),
    jumlah_tersedia: await db.riwayatPenggunaan.count(),
    jumlah_laporan: await db.laporan.count(),
  };
  callback(jumlahData);
}

module.exports = {
  getJumlahData,
};