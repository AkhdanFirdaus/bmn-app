const { default: axios } = require("axios");
const db = require("./db");
const helpers = require("./helpers");
const { model_url } = require("./constants");

async function getSummary({ callback }) {
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

  callback("Summary");
}

async function getPrediksi({
  laporan,
  pelapor,
  kendaraanId,
  callback,
  errorCallback,
}) {
  try {
    const kendaraan = await db.kendaraan.findFirst({
      where: {
        id: kendaraanId,
      },
    });
    const kendaraanmsg = [
      `Merk: ${kendaraan.merk}`,
      `No Polisi: ${kendaraan.noPolisi}`,
    ].join("\n");

    const labels = await helpers.getLabels();

    const body = JSON.stringify({
      labels,
      inputs: [laporan, laporan],
    });

    const response = await axios.post(`${model_url}/predict`, body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const output = response.data.data.outputs[0];
    let laporanId;

    await db.$transaction(async (tx) => {
      const hasil_laporan = await tx.laporan.create({
        data: {
          laporan: laporan,
          pelapor_id: pelapor,
          kendaraanId: kendaraanId,
        },
      });

      laporanId = hasil_laporan.id;

      for (const label of output.label) {
        const labelId = labels.find((item) => item.label === label).id;
        await tx.outputKlasifikasi.create({
          data: {
            labelId: labelId,
            laporanId: hasil_laporan.id,
            isDeleted: false,
          },
        });
      }
    });

    const prediksi_kerusakan = output.label.join("\n");

    // TODO: dapatkan prediksi biaya perawatan dan suku cadang

    const messages = [
      "Halo! Terima kasih telah melaporkan kerusakan kendaraan",
      `Laporan *No.${laporanId}* telah diterima`,
      "\n*Kendaraan:*",
      kendaraanmsg,
      "\n*Prediksi Kerusakan:*",
      prediksi_kerusakan,
      "\n*Kondisi:*",
      `indeks kerusakan = ${output.severity}`,
    ];
    callback(messages.join("\n"));
  } catch (error) {
    console.log(error);
    errorCallback(
      "*Terjadi kesalahan:* ",
      error ?? "Model tidak dapat memproses laporan"
    );
  }
}

async function getKendaraan({ callback }) {
  const kendaraan = await db.kendaraan.findMany({
    orderBy: {
      id: "asc",
    },
  });
  const response = [
    "List Kendaraan Kosong\n",
    "Ketik !kendaraan <nomor> untuk melihat detail kendaraan",
    kendaraan.map((item) => item.id + ". " + item.merk).join("\n"),
  ];
  callback(response.join("\n"));
}

async function getDetailKendaraan({ id, callback }) {
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
      `Status Pengunaan: ${helpers.getStatusPenggunaan(
        kendaraan.statusPenggunaan
      )}`,
      `Tgl Perolehan: ${kendaraan.tglPerolehan}`,
      `No BPKB: ${kendaraan.noBpkb}`,
      `No Polisi: ${kendaraan.noPolisi}`,
      `Kondisi: ${kendaraan.kondisi}`,
      `Pemakai: ${kendaraan.pemakai}`,
    ];

    callback(response.join("\n"));
  } catch (error) {
    const response = [
      "Kendaraan tidak ditemukan",
      "Error: " + JSON.stringify(error),
    ];
    callback(response.join("\n"));
  }
}

async function pinjamKendaraan({ kendaraanId, userId, callback }) {
  try {
    const kendaraan = await db.kendaraan.findFirst({
      where: {
        id: parseInt(kendaraanId),
      },
    });

    if (kendaraan.statusPenggunaan === 1) {
      const response = ["Kendaraan sedang dipinjam"];
      callback(response.join("\n"));
    } else {
      await db.kendaraan.update({
        where: {
          id: parseInt(kendaraanId),
        },
        data: {
          statusPenggunaan: 1,
          pemakai: userId,
        },
      });
      const response = ["Kendaraan berhasil dipinjam"];
      callback(response.join("\n"));
    }
  } catch (error) {
    const response = [
      "Kendaraan tidak ditemukan",
      "Error: " + JSON.stringify(error),
    ];
    callback(response.join("\n"));
  }
}

async function successPinjam({ peminjamanId, callback }) {
  const admin = await helpers.getAdmin();
  const laporan = await db.riwayatPenggunaan.findFirst({
    where: {
      AND: [{ id: parseInt(peminjamanId) }, { isApproved: false }],
    },
    include: {
      kendaraan: true,
    },
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
    messages: messages.join("\n"),
  });
}

async function listPeminjaman({ callback }) {
  const peminjaman = await db.riwayatPenggunaan.findMany({
    where: {
      isApproved: false,
    },
    include: {
      pengguna: true,
      kendaraan: true,
    },
  });

  const messages = [
    "List Peminjaman",
    peminjaman
      .map(
        (item) =>
          `*${item.id}*. ${item.pengguna.nama} - ${item.kendaraan.merk} - ${item.mulai}`
      )
      .join("\n"),
    "Untuk acc ketik *!acc <id>*",
  ];

  callback(messages.join("\n"));
}

async function accPeminjaman({ peminjamanId, callback, errorCallback }) {
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
      },
    });

    const pdfBuffer = await helpers.createPDF();
    const pdf = Buffer.from(pdfBuffer).toString("base64");

    callback({
      chatId: helpers.phoneNumberFormatter(peminjaman.pengguna.phoneNumber),
      messages: `Peminjaman dengan kode: *${peminjaman.id}* berhasil diacc, silahkan ambil kunci di admin`,
      media: pdf,
    });
  } catch (error) {
    console.log(error);
    errorCallback("Error: " + JSON.stringify(error));
  }
}

async function getStatusPeminjaman({ userId, callback }) {
  // TODO: Bikin Query untuk summary riwayat penggunaan dari riwayatPenggunaan dengan pengguna=userId
  const riwayatPenggunaan = await db.riwayatPenggunaan.findMany({
    where: {
      pengguna_id: parseInt(userId),
    },
    include: {
      kendaraan: true,
    },
  });

  const riwayatlist = riwayatPenggunaan
    .map((item) => {
      return [
        item.kendaraan.merk,
        `Tahun (Umur): ${helpers.getAge(item.kendaraan.tglPerolehan)}`,
        `Mulai Pinjam: ${helpers.convertDateString(item.mulai)}`,
        `Status: ${item.selesai !== null ? "Selesai" : "Belum Selesai"}`,
        `Keterangan: ${item.keterangan ?? "-"}`,
        "Kondisi: Baik",
      ].join("\n");
    })
    .join("\n");

  const messages = ["Peminjaman\n", riwayatlist];
  callback(messages.join("\n"));
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
  getStatusPeminjaman,
};
