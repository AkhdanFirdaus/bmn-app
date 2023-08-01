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
const { checkAuthentication } = require('./src/helpers');
const commandsController = require('./src/commands');
const commandsFrontendController = require('./src/commands-frontend');

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
        socket.emit('message', `user (${socket.id}) Connected`);
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

  socket.on('get_jumlah_data', async () => {
    socket.emit('message', 'Mengambil jumlah data kendaraan...');
    await commandsFrontendController.getJumlahData({
      callback: (jumlahData) => {
        socket.emit('data', jumlahData);
        socket.emit('message', 'Berhasil mengambil jumlah data kendaraan');
      }
    });
  });

  client.on('qr', (qr) => {
    console.log(qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
    });
  });

  client.on('authenticated', () => {
    console.log('Chatbot: authenticated');
    socket.emit('message', `Chatbot (${socket.id}) Authenticated`);
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
    const response = [
      'Halo! ada yang bisa saya bantu?\n',
      'Berikut adalah perintah yang bisa kamu gunakan:',
      '!help - menampilkan pesan bantuan',
      '!daftar - menampilkan pesan daftar',
      '!kendaraan - menampilkan pesan kendaraan',
      '!kendaraan <id> - menampilkan detail kendaraan',
    ];
    message.reply(response.join('\n'));
  }

  if (command.startsWith('!daftar')) {
    const contact = await message.getContact();
    const response = [
      'Silahkan isi form pendaftaran berikut:',
      `${BASE_URL}/daftar?phone=${contact.id.user}`,
    ];
    message.reply(response.join('\n'));
  }

  if (command.startsWith('!kendaraan')) {
    const params = command.split(' ');
    const contact = await message.getContact();
    const number = contact.id.user;
    
    const checkIfAuth = await checkAuthentication(number);

    if (checkIfAuth instanceof Error) {
      message.reply('Anda tidak terdaftar sebagai pengguna');
      return;
    }

    if (params[1]) {
      await commandsController.getDetailKendaraan({ 
        id: params[1],
        callback: (response) => {
          message.reply(response);
        }
      });
    } else {
      await commandsController.getKendaraan({
        callback: (response) => {
          message.reply(response);
        }
      });
    }
    
  }

  if (command.startsWith('!lapor')) {
    const body = command.replace('!lapor ', '');
    const contact = await message.getContact();
    const number = contact.id.user;
    
    const checkIfAuth = await checkAuthentication(number);

    if (checkIfAuth instanceof Error) {
      message.reply('Anda tidak terdaftar sebagai pengguna');
      return;
    }

    await commandsController.getPrediksi({
      laporan: body,
      callback: (response) => {
        message.reply(response);
      }
    });
  }

  if (!command.startsWith('!')) {
    const response = 'Maaf, saya tidak mengerti apa yang anda maksud. Silahkan ketik *!help* untuk melihat daftar perintah';
    message.reply(response);
  }
});

const port = process.env.PORT || 3003;
server.listen(port, () => {
  console.log(`APP running on *:${port}`);
});