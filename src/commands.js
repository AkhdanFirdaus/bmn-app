const { default: axios } = require('axios');
const db = require('./db');
const { getStatusPenggunaan } = require('./helpers');

async function getPrediksi({laporan, callback}) {
  const model_url = process.env.MODEL_URL || 'https://model.umum-pendis.online';
  const result = await axios.post(`${model_url}/predict`, {
    inputs: [laporan],
  });

  const { data } = result.data;

  const response = [
    'attention_mask: ' + JSON.stringify(data.attention_mask),
    'input_ids: ' + JSON.stringify(data.input_ids),
  ];
  callback(response.join('\n'));
}

async function getKendaraan({callback}) {
  const kendaraan = await db.kendaraan.findMany({
    orderBy: {
      id: 'asc',
    }
  });
  const response = [
    'List Kendaraan Kosong\n',
    kendaraan.map((item) => (item.id) + '. ' + item.merk).join('\n'),
    'Ketik !kendaraan <nomor> untuk melihat detail kendaraan',
  ];
  callback(response.join('\n'));
}

async function getDetailKendaraan({id, callback}) {
  try {
    const kendaraan = await db.kendaraan.findFirst({
      where: {
        id: parseInt(id),
      },
    });
    const response = [
      `Detail Kendaraan ${id} \n`,
      `Merk: ${kendaraan.merk}`,
      `Jenis: ${kendaraan.namaBarang}`,
      `NUP: ${kendaraan.nup}`,
      `Status Pengunaan: ${getStatusPenggunaan(kendaraan.statusPenggunaan)}`,
      `Tgl Perolehan: ${kendaraan.tglPerolehan}`,
      `No BPKB: ${kendaraan.noBpkb}`,
      `No Polisi: ${kendaraan.noPolisi}`,
      `Kondisi: ${kendaraan.kondisi}`,
      `Pemakai: ${kendaraan.pemakai}`,
    ];

    callback(response.join('\n'));
  } catch (error) {
    const response = [
      'Kendaraan tidak ditemukan',
      'Error: ' + JSON.stringify(error),
    ];
    callback(response.join('\n'));
  }
}

module.exports = {
  getPrediksi,
  getKendaraan,
  getDetailKendaraan,
};