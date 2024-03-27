const db = require("./db");
const helpers = require("./helpers");

async function getKendaraan(req, res) {
  try {
    // get type from query params
    const { type } = req.query;

    let query = {};

    if (type === "dengan-kondisi") {
      query = {
        include: {
          laporan: {
            where: {
              isDeleted: false,
            },
            select: {
              outputKlasifikasi: {
                select: {
                  label: {
                    select: {
                      id: true,
                      label: true,
                      bobot: true,
                    },
                  },
                },
                where: {
                  isDeleted: false,
                },
              },
            },
          },
        },
      };
    }
    const kendaraan = await db.kendaraan.findMany({ ...query });

    const data = kendaraan.map((item) => {
      if (type === "dengan-kondisi") {
        const kondisi = helpers.getKondisi(item.laporan);
        delete item.laporan;
        return {
          ...item,
          kondisi,
        };
      } else {
        delete item.laporan;
        return item;
      }
    });
    res.json({
      message: "Success get kendaraan",
      data,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed get kendaraan",
      data: error,
    });
  }
}

async function getKendaraanDetail(req, res) {
  try {
    const { id } = req.params;
    const { type } = req.query;

    let query = {};

    if (type === "dengan-kondisi") {
      query = {
        include: {
          laporan: {
            where: {
              isDeleted: false,
            },
            select: {
              outputKlasifikasi: {
                select: {
                  label: {
                    select: {
                      id: true,
                      label: true,
                      bobot: true,
                    },
                  },
                },
                where: {
                  isDeleted: false,
                },
              },
            },
          },
        },
      };
    }

    const kendaraan = await db.kendaraan.findFirst({
      where: { id: parseInt(id) },
      ...query,
    });

    if (type === "dengan-kondisi") {
      const kondisi = helpers.getKondisi(kendaraan.laporan);
      delete kendaraan.laporan;
      res.json({
        message: "Kondisi Kendaraan",
        data: {
          ...kendaraan,
          kondisi,
        },
      });
    } else {
      res.json({
        message: "Success get kendaraan detail",
        data: kendaraan,
      });
    }
  } catch (error) {
    res.status(400).json({
      message: "Failed get kendaraan detail",
      data: error,
    });
  }
}

async function getUserDetail(req, res) {
  try {
    const { phoneNumber } = req.params;
    const user = await db.user.findFirstOrThrow({
      where: { phoneNumber },
    });
    res.json({
      message: "Success get user",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed get user",
      data: error,
    });
  }
}

async function postDaftar(req, res) {
  try {
    const { nama, phoneNumber, pin } = req.body;
    const user = await db.user.create({
      data: {
        nama,
        phoneNumber,
        pin,
      },
    });
    res.json({
      message: "Berhasil daftar",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      message: "Gagal daftar",
      data: error,
    });
  }
}

async function postPinjam(req, res) {
  try {
    const { phoneNumber, tanggalPinjam, kendaraanId, keterangan, pin } =
      req.body;

    console.log(req.body);

    const user = await helpers.checkAuthentication(phoneNumber);

    if (!user) {
      return res.status(401).json({
        message: "User tidak ditemukan",
      });
    }

    if (user.pin !== pin) {
      return res.status(401).json({
        message: "Pin salah",
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
      message: "Terjadi kesalahan",
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
