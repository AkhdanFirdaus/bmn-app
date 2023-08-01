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

async function checkAuthentication(phoneNumber) {
  try {
    const user = await db.user.findFirstOrThrow({
      where: {phoneNumber}
    });
    return user;
  } catch (error) {
    return Error('User not found');
  }
}

module.exports = {
  getStatusPenggunaan,
  phoneNumberFormatter,
  checkAuthentication,
};