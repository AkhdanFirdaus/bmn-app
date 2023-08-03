const db = require('./db');
const { checkAuthentication } = require('./helpers');

async function getKendaraan(req, res) {
  try {
    const kendaraan = await db.kendaraan.findMany();
    res.json({
      message: 'Success get kendaraan',
      data: kendaraan,
    });
  } catch (error) {
    res.status(400).json({
      message: 'Failed get kendaraan',
      data: error,
    });
  }
}

async function getKendaraanDetail(req, res) {
  try {
    const {id} = req.params;
    const kendaraan = await db.kendaraan.findFirst({
      where: {id: parseInt(id)},
    });
    res.json({
      message: 'Success get kendaraan detail',
      data: kendaraan,
    });
  } catch (error) {
    res.status(400).json({
      message: 'Failed get kendaraan detail',
      data: error,
    });
  }
}

async function getUserDetail(req, res) {
  try {
    const {phoneNumber} = req.params;
    const user = await db.user.findFirstOrThrow({
      where: {phoneNumber},
    });
    res.json({
      message: 'Success get user',
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      message: 'Failed get user',
      data: error,
    });
  }
}

async function postDaftar(req, res) {
  try {
    const {nama, phoneNumber, pin} = req.body;
    const user = await db.user.create({
      data: {
        nama,
        phoneNumber,
        pin,
      },
    });
    res.json({
      message: 'Berhasil daftar',
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      message: 'Gagal daftar',
      data: error,
    });
  }
}

async function postPinjam(req, res) {
  try {
    const {phoneNumber, tanggalPinjam, kendaraanId, keterangan, pin} = req.body;

    console.log(req.body);

    const user = await checkAuthentication(phoneNumber);
    
    if (!user) {
      return res.status(401).json({
        message: 'User tidak ditemukan',
      });
    }

    if (user.pin !== pin) {
      return res.status(401).json({
        message: 'Pin salah',
      });
    }

    const peminjaman = await db.riwayatPenggunaan.create({
      data: {
        mulai: new Date(tanggalPinjam),
        keterangan,
        kendaraan: {
          connect: {
            id: parseInt(kendaraanId),
          },
        },
        pengguna: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    await db.kendaraan.update({
      where: {
        id: parseInt(kendaraanId),
      },
      data: {
        pemakai: user.nama,
      },
    });

    res.json({
      message: `Kode Peminjaman: ${peminjaman.id} telah diajukan. Silahkan tunggu konfirmasi dari admin`,
      data: peminjaman.id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: 'Terjadi kesalahan',
      error,
    });
  }
}

module.exports = {
  getKendaraan,
  getKendaraanDetail,
  getUserDetail,
  postPinjam,
  postDaftar,
};