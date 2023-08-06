const db = require('./db');
const helpers = require('./helpers');

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
      outputKlasifikasi: {
        select: {
          label: {
            select: {
              id: true,
              label: true,
              bobot: true
            }
          }
        },
        where: {
          isDeleted: false,
        }
      }
    }
  });

  const pelapor_aktif = [];

  const laporan = laporanSummary.map((item) => {
    if (!pelapor_aktif.includes(item.pelapor_id)) {
      pelapor_aktif.push(item.pelapor_id);
    }
    const kondisi = helpers.getKondisiLaporan(item.outputKlasifikasi);
    delete item.outputKlasifikasi;
    return {
      ...item,
      kondisi,
    };
  });

  const data = {
    laporan: laporan,
    jumlah_laporan: laporan.length,
    jumlah_pelapor: pelapor_aktif.length,
    jumlah_masalah: 0,
    rata_kondisi: 'Baik',
  };
  callback(data);
}

module.exports = {
  getJumlahData,
  getLaporanSummary,
};