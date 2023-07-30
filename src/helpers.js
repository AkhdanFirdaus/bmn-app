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

module.exports = {
  getStatusPenggunaan,
};