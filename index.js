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
const helpers = require('./src/helpers');
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
    try {
      console.log('ada permintaan untuk cek autentikasi');
      await client.getContacts();
      socket.emit('message', `user (${socket.id}) Connected`);
    } catch (error) {
      socket.emit('message', 'Whatsapp Loading');
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

  socket.on('get_laporan_summary', async () => {
    socket.emit('message', 'Mengambil data laporan...');
    await commandsFrontendController.getLaporanSummary({
      callback: (data) => {
        socket.emit('data', data);
        socket.emit('message', 'Berhasil mengambil data laporan');
      }
    });
  });

  socket.on('success_pinjam', async (data) => {
    socket.emit('message', 'Mengirim data peminjaman...');
    await commandsController.successPinjam({
      peminjamanId: data,
      callback: (response) => {
        client.sendMessage(response.chatId, response.messages);
      }
    });
  });

  client.on('qr', (qr) => {
    console.log(qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
    });
  });

  client.on('authenticated', (data) => {
    console.log('Chatbot: authenticated');
    console.log('Authenticated ', data);
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
  const contact = await message.getContact();
  const number = contact.id.user;
  
  if (command.startsWith('!help')) {
    let response;

    const checkIfAdmin = await helpers.checkAuthenticationAdmin(number);
  
    const defaultcommands = [
      'Halo! ada yang bisa saya bantu?\n',
      'Berikut adalah perintah yang bisa kamu gunakan:',
      '*!help* - menampilkan pesan bantuan',
      '*!kendaraan* - menampilkan pesan kendaraan',
      '*!kendaraan <id>* - menampilkan detail kendaraan',
    ];
    
    if (checkIfAdmin instanceof Error) {
      response = [
        ...defaultcommands,
        '*!pinjam <id>* - mengajukan peminjaman kendaraan',
        '*!daftar* - menampilkan pesan daftar',
        '*!lapor <isi laporan>* - melaporkan kondisi kendaraan',
        '*!status* - melihat status peminjaman kendaraan',
      ];
    } else {
      response = [
        ...defaultcommands,
        '*!acc list* - melihat semua permohonan peminjaman',
        '*!acc <id>* - melakukan persetujuan peminjaman',
      ];
    }
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

    console.log(contact);
    
    const checkIfAuth = await helpers.checkAuthentication(number);

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

  if (command.startsWith('!pinjam')) {
    const params = command.split(' ');
    const contact = await message.getContact();
    const number = contact.id.user;
    
    const checkIfAuth = await helpers.checkAuthentication(number, true);

    if (checkIfAuth instanceof Error) {
      message.reply('Anda tidak terdaftar sebagai pengguna');
      return;
    }

    if (params[1]) {
      const checkKendaraan = await helpers.checkKendaraan(params[1]);

      if (checkKendaraan instanceof Error) {
        message.reply('Kendaraan tidak ditemukan');
        return;
      }

      const response = [
        'Silahkan isi form peminjaman berikut:',
        `${BASE_URL}/pinjam?phone=${number}&kendaraan=${checkKendaraan}`,
      ];
      message.reply(response.join('\n'));
    } else {
      message.reply('Silahkan ketik *!pinjam <id kendaraan>*');
    }
  }

  if (command.startsWith('!lapor')) {
    const body = command.replace('!lapor ', '');
    const contact = await message.getContact();
    const number = contact.id.user;
    
    const checkIfAuth = await helpers.checkAuthentication(number, true);

    if (checkIfAuth instanceof Error) {
      message.reply('Anda tidak terdaftar sebagai pengguna');
      return;
    }

    console.log(checkIfAuth);

    await commandsController.getPrediksi({
      laporan: body,
      pelapor: checkIfAuth.id,
      kendaraanId: checkIfAuth.riwayatPenggunaan[0].kendaraan_id,
      callback: (response) => {
        message.reply(response);
      },
      errorCallback: (messages) => {
        message.reply(messages);
      }
    });
  }

  if (command.startsWith('!acc')) {
    const params = command.split(' ');
    const contact = await message.getContact();
    const number = contact.id.user;
    
    const checkIfAdmin = await helpers.checkAuthenticationAdmin(number);

    if (checkIfAdmin instanceof Error) {
      message.reply('Anda bukan admin');
      return;
    }

    if (params[1] === 'list') {
      await commandsController.listPeminjaman({
        callback: async (response) => {
          message.reply(response);
        }
      });
    } else if (!isNaN(parseInt(params[1]))) {
      await commandsController.accPeminjaman({
        peminjamanId: params[1],
        callback: async (response) => {
          message.reply(response.messages);
          await client.sendMessage(response.chatId, response.messages);
        },
        errorCallback: (messages) => {
          message.reply(messages);
        }
      });
    } else {
      message.reply('Silahkan ketik *!acc <id peminjaman>*');
    }
  }

  if (command.startsWith('!status')) {
    const contact = await message.getContact();
    const number = contact.id.user;
    
    const checkIfAuth = await helpers.checkAuthentication(number, true);

    if (checkIfAuth instanceof Error) {
      message.reply('Anda tidak terdaftar sebagai pengguna');
      return;
    }

    console.log(checkIfAuth);

    await commandsController.getStatusPeminjaman({
      userId: checkIfAuth.id,
      callback: async (response) => {
        message.reply(response);
      },
      errorCallback: (messages) => {
        message.reply(messages);
      }
    });
  }

  if (!command.startsWith('!')) {
    const response = [
      'Maaf, saya tidak mengerti apa yang anda maksud.',
      'Silahkan ketik *!help* untuk melihat daftar perintah'
    ];
    message.reply(response.join('/n'));
  }
});

const port = process.env.PORT || 3003;
server.listen(port, () => {
  console.log(`APP running on *:${port}`);
  io.emit('message', 'Chatbot connecting');
});