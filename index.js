require('dotenv').config();

const BASE_URL = process.env.BASE_URL;

const path = require('path');
const routes = require('./src/routes');

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const cors = require('cors');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const db = require('./src/db');
const { getStatusPenggunaan, checkAuthentication } = require('./src/helpers');

const options = {
  cors: {
    origin: '*',
    method: ['GET', 'POST'],
  }
};

const io = new Server(server, options);

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on('ready', () => {
  console.log('Chatbot: is ready');
});

client.initialize();

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors(options));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use('/', routes);

io.on('connection', (socket) => {
  console.log(`Socket: a user (${socket.id}) Connected`);

  socket.on('is_authenticated', async () => {
    console.log('ada permintaan untuk cek autentikasi');
    try {
      const contacts = await client.getContacts();
      if (contacts.length > 0) {
        socket.emit('message', `a user (${socket.id}) Connected`);
      }
    } catch (error) {
      socket.emit('message', 'Whatsapp Disconnected');
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`Socket: user (${socket.id}) Disconnected`);
  });

  socket.on('get_kendaraan', async () => {
    socket.emit('message', 'Mengambil data kendaraan...');
    const kendaraan = await db.kendaraan.findMany();
    socket.emit('data', kendaraan);
  });

  client.on('qr', (qr) => {
    console.log(qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
    });
  });

  client.on('authenticated', () => {
    console.log('Chatbot: authenticated');
    socket.emit('message', `a user (${socket.id}) Connected`);
  });

  client.on('disconnected', () => {
    socket.emit('message', `You're (${socket.id}) Disconnected`);
    client.destroy();
    client.initialize();
  });
});

client.on('message', async (message) => {
  const command = message.body;

  if (command.startsWith('!help')) {
    let responses = '';
    responses += 'Halo! ada yang bisa saya bantu? \n\n';
    responses += 'Berikut adalah perintah yang bisa kamu gunakan: \n';
    responses += '!help - menampilkan pesan bantuan \n';
    responses += '!daftar - menampilkan pesan daftar \n';
    responses += '!kendaraan - menampilkan pesan kendaraan \n';
    responses += '!kendaraan <id> - menampilkan detail kendaraan \n';
    message.reply(responses);
  }

  if (command.startsWith('!daftar')) {
    const contact = await message.getContact();
    let responses = '';
    responses += 'Silahkan isi form pendaftaran berikut: \n';
    responses += `${BASE_URL}/daftar?phone=${contact.id.user}`;
    message.reply(responses);
  }

  if (command.startsWith('!kendaraan')) {
    const params = command.split(' ');
    const { number } = await message.getContact();
    
    let responses = '';

    const checkIfAuth = await checkAuthentication(number);

    if (checkIfAuth instanceof Error) {
      responses += 'Anda tidak terdaftar sebagai pengguna';
      message.reply(responses);
      return;
    }

    if (params[1]) {
      responses += `Detail Kendaraan ${params[1]} \n\n`;
      try {
        const kendaraan = await db.kendaraan.findFirst({
          where: {
            id: parseInt(params[1]),
          },
        });
        responses += 'Merk: ' + kendaraan.merk + '\n';
        responses += 'Jenis: ' + kendaraan.namaBarang + '\n';
        responses += 'NUP: ' + kendaraan.nup + '\n';
        responses += 'Status Pengunaan: ' + getStatusPenggunaan(kendaraan.statusPenggunaan) + '\n';
        responses += 'Tgl Perolehan: ' + kendaraan.tglPerolehan + '\n';
        responses += 'No BPKB: ' + kendaraan.noBpkb + '\n';
        responses += 'No Polisi: ' + kendaraan.noPolisi + '\n';
        responses += 'Kondisi: ' + kendaraan.kondisi + '\n';
        responses += 'Pemakai: ' + kendaraan.pemakai + '\n';
      } catch (error) {
        responses += 'Kendaraan tidak ditemukan\n';
        responses += 'Error: ' + JSON.stringify(error) + '\n';
      }
      
    } else {
      responses += 'List Kendaraan Kosong\n\n';
      const kendaraan = await db.kendaraan.findMany({
        orderBy: {
          id: 'asc',
        }
      });
      responses += kendaraan.map((item) => (item.id) + '. ' + item.merk).join('\n');
      responses += '\n\nKetik !kendaraan <nomor> untuk melihat detail kendaraan';
    }
    
    message.reply(responses);
  }

  if (!command.startsWith('!')) {
    const responses = 'Maaf, saya tidak mengerti apa yang anda maksud. Silahkan ketik *!help* untuk melihat daftar perintah';
    message.reply(responses);
  }
});

const port = process.env.PORT || 3003;
server.listen(port, () => {
  console.log(`APP running on *:${port}`);
});