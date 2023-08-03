const db = require('./db');

/* eslint-disable indent */
function getStatusPenggunaan(status) {
  // 0 digunakan dinas operasional, 1 digunakan dinas jabatan
  switch (status) {
    case 0:
      return 'Dinas Operasional';
    case 1:
      return 'Dinas Jabatan';
    default:
      return 'Tidak diketahui';
  }
}

function phoneNumberFormatter(number) {
  let str = String(number);

  // 1. Menghilangkan karakter selain angka
  let formatted = str.replace(/\D/g, '');

  // 2. Menghilangkan prefix 0 di depan -> di ganti dengan 62
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1);
  }

  if (!formatted.endsWith('@c.us')) {
    formatted += '@c.us';
  }

  return formatted;
}

async function checkAuthentication(phoneNumber, getKendaraan=false) {
  try {
    let customQuery = {};
    if (getKendaraan) {
      customQuery = {
        include: {
          riwayatPenggunaan: {
            select: {
              kendaraan_id: true,
            },
            where: {
              AND: [
                {isApproved: true},
                {selesai: null},
              ]
            },
            orderBy: {
              id: 'desc',
            },
            take: 1,
          },
        }
      };
    }
    const user = await db.user.findFirstOrThrow({
      where: {phoneNumber},
      ...customQuery
    });
    return user;
  } catch (error) {
    console.log('Check authentication error: ', error);
    return Error('User not found');
  }
}

async function checkAuthenticationAdmin(phoneNumber) {
  try {
    const user = await db.user.findFirstOrThrow({
      where: {
        AND: [
          {phoneNumber},
          {role: 'admin'},
        ]
      },
    });
    return user;
  } catch (error) {
    return Error('User not found');
  }
}

async function checkKendaraan(kendaraanId) {
  try {
    const kendaraan = await db.kendaraan.findFirstOrThrow({
      where: {id: parseInt(kendaraanId), isDeleted: false},
    });
    return kendaraan.id;
  } catch (error) {
    return Error('Kendaraan not found');
  }
}

async function getLabels(indexes = []) {
  const labels = await db.label.findMany({
    where: {
      indeks: {
        in: indexes,
      },
    },
  });
  console.log('labels = ', labels);
  return labels;
}

async function getAdmin() {
  const admin = await db.user.findFirst({
    where: {role: 'admin'},
  });
  return {
    chatId: phoneNumberFormatter(admin.phoneNumber),
    ...admin,
  };
}

module.exports = {
  getStatusPenggunaan,
  phoneNumberFormatter,
  checkAuthentication,
  checkAuthenticationAdmin,
  checkKendaraan,
  getLabels,
  getAdmin,
};