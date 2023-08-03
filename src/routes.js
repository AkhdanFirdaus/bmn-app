const path = require('path');
const routes = require('express').Router();
const controllers = require('./controllers');

routes.get('/api/kendaraan', controllers.getKendaraan);
routes.get('/api/kendaraan/:id', controllers.getKendaraanDetail);
routes.get('/api/user/:phoneNumber', controllers.getUserDetail);
routes.post('/api/daftar', controllers.postDaftar);
routes.post('/api/pinjam', controllers.postPinjam);

routes.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

routes.get('/laporan', async (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'laporan.html'));
});

routes.get('/kendaraan', async (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'kendaraan.html'));
});

routes.get('/kendaraan/:id', async (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'kendaraan_detail.html'));
});

routes.get('/penggunaan', async (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'penggunaan.html'));
});

routes.get('/daftar', async (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'daftar.html'));
});

routes.get('/pinjam', async (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pinjam.html'));
});

module.exports = routes;