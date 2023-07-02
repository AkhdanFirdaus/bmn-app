const path = require('path');

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on('ready', () => {
  console.log('Chatbot: is ready');
});

client.initialize();

const io = new Server(server);

app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

server.listen(3000, () => {
  console.log('APP running on *:3000');
});