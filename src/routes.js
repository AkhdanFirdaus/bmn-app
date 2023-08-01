const path = require('path');
const routes = require('express').Router();
const db = require('./db');

routes.get('/api', async (req, res) => {
  const kendaraan = await db.kendaraan.findMany();
  res.json({
    message: 'Hello World',
    data: kendaraan,
  });
});

routes.get('/api/user/:phoneNumber', async (req, res) => {
  const {phoneNumber} = req.params;
  const user = await db.user.findFirst({
    where: {phoneNumber},
  });
  res.json({
    message: 'Success get user',
    data: user,
  });
});

routes.post('/api/daftar', async (req, res) => {
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
});

routes.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

routes.get('/kendaraan', async (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'kendaraan.html'));
});

routes.get('/daftar', async (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'daftar.html'));
});


module.exports = routes;