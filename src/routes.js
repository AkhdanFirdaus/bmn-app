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

routes.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

routes.get('/kendaraan', async (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'kendaraan.html'));
});

module.exports = routes;