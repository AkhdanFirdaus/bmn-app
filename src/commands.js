const { default: axios } = require('axios');
const db = require('./db');
const helpers = require('./helpers');

async function getSummary({callback}) {
  // const klasifikasi = await db.outputKlasifikasi.groupBy({
  //   by: ['laporan_id'],
  //   where: {
  //     isDeleted: false,
  //   }
  // });
  // ENDPOINT: /summary-predict
  // TODO: dapakan seluruh data output klasifikasi kendaraan berdasarkan isDeleted false
  // TODO: call api untuk prediksi kondisi kendaraan
  // TODO: call api untuk prediksi biaya perawatan dan suku cadang
  
  callback('Summary');
}

async function getPrediksi({laporan, pelapor, kendaraanId, callback}) {
  const model_url = process.env.MODEL_URL || 'https://model.umum-pendis.online';
  const result = await axios.post(`${model_url}/predict`, {
    inputs: [laporan],
  });

  const { data } = result.data;

  // TODO: save to output klasifikasi db
  const hasil_laporan = await db.laporan.create({
    data: {
      laporan: laporan,
      pelapor_id: pelapor,
      kendaraanId: kendaraanId,
    }
  });
  // const hasil_laporan = {id: 4};

  
  // TODO: dapatkan label yang terdeteksi
  const outputs = [];
  for (let i=0; i< data.outputs.length; i++) {
    if (data.outputs[i] === 1) {
      outputs.push(i);
    }
  }

  const labels = await helpers.getLabels(outputs);
  console.log(labels);
  const labeled_output = [];
  for (const item of labels) {
    await db.outputKlasifikasi.create({
      data: {
        labelId: item.id,
        laporanId: hasil_laporan.id,
      }
    });
    labeled_output.push(item.label);
  }
  const prediksi_kerusakan = labeled_output.map((item) => `- ${item}\n`).join('');
  
  // TODO: dapatkan prediksi biaya perawatan dan suku cadang


  // TODO: Dapatkan indeks kerusakan
  const severity = `\nindeks kerusakan = ${data.severity.index}\nlabel = ${data.severity.label}`;

  const response = [
    `pelapor = ${pelapor}`,
    `id_laporan = ${hasil_laporan.id}`,
    `id_kendaraan = ${kendaraanId}`,
    '\n*Prediksi Kerusakan:*',
    prediksi_kerusakan,
    '\n*Kondisi:*',
    severity,
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
    'Ketik !kendaraan <nomor> untuk melihat detail kendaraan',
    kendaraan.map((item) => (item.id) + '. ' + item.merk).join('\n'),
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
      `Status Pengunaan: ${helpers.getStatusPenggunaan(kendaraan.statusPenggunaan)}`,
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

async function pinjamKendaraan({kendaraanId, userId, callback}) {
  try {
    const kendaraan = await db.kendaraan.findFirst({
      where: {
        id: parseInt(kendaraanId),
      },
    });

    if (kendaraan.statusPenggunaan === 1) {
      const response = [
        'Kendaraan sedang dipinjam',
      ];
      callback(response.join('\n'));
    } else {
      await db.kendaraan.update({
        where: {
          id: parseInt(kendaraanId),
        },
        data: {
          statusPenggunaan: 1,
          pemakai: userId,
        }
      });
      const response = [
        'Kendaraan berhasil dipinjam',
      ];
      callback(response.join('\n'));
    }
  } catch (error) {
    const response = [
      'Kendaraan tidak ditemukan',
      'Error: ' + JSON.stringify(error),
    ];
    callback(response.join('\n'));
  }
}

async function successPinjam({peminjamanId, callback}) {
  const admin = await helpers.getAdmin();
  const laporan = await db.riwayatPenggunaan.findFirst({
    where: {
      AND: [
        {id: parseInt(peminjamanId)},
        {isApproved: false}
      ]
    },
    include: {
      kendaraan: true,
    }
  });

  const messages = [
    `Kendaraan: ${laporan.kendaraan.merk}`,
    `Nopol: ${laporan.kendaraan.noPolisi}`,
    `Tgl Peminjaman: ${laporan.mulai}`,
    `Keterangan: ${laporan.keterangan}`,
    `Untuk acc ketik *!acc ${laporan.id}*`,
  ];

  callback({
    chatId: admin.chatId,
    messages: messages.join('\n'),
  });
}

async function listPeminjaman({callback}) {
  const peminjaman = await db.riwayatPenggunaan.findMany({
    where: {
      isApproved: false,
    },
    include: {
      pengguna: true,
      kendaraan: true,
    }
  });

  const messages = [
    'List Peminjaman',
    peminjaman.map((item) => (
      `*${item.id}*. ${item.pengguna.nama} - ${item.kendaraan.merk} - ${item.mulai}`
    )).join('\n'),
    'Untuk acc ketik *!acc <id>*',
  ];

  callback(messages.join('\n'));
}

async function accPeminjaman({peminjamanId, callback, errorCallback}) {
  try {
    const peminjaman = await db.riwayatPenggunaan.update({
      where: {
        id: parseInt(peminjamanId),
      },
      data: {
        isApproved: true,
      },
      include: {
        pengguna: true,
      }
    });
    callback({
      chatId: helpers.phoneNumberFormatter(peminjaman.pengguna.phoneNumber),
      messages: `Peminjaman dengan kode: *${peminjaman.id}* berhasil diacc, silahkan ambil kunci di admin`,
    });
  } catch (error) {
    console.log(error);
    errorCallback('Error: ' + JSON.stringify(error));
  }
}

async function getStatusPeminjaman({userId, callback}) {
  // TODO: Bikin Query untuk summary riwayat penggunaan dari riwayatPenggunaan dengan pengguna=userId
  callback(`Halo ${userId} Maaf, fitur ini belum tersedia`);
}

module.exports = {
  getPrediksi,
  getKendaraan,
  getDetailKendaraan,
  getSummary,
  pinjamKendaraan,
  successPinjam,
  listPeminjaman,
  accPeminjaman,
  getStatusPeminjaman
};