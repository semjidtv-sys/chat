const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Файлын замыг боломжит бүх байршлаар шалгах
const rootPublic = path.join(__dirname, '../public');
const serverPublic = path.join(__dirname, 'public');

if (fs.existsSync(rootPublic)) {
  app.use(express.static(rootPublic));
}
if (fs.existsSync(serverPublic)) {
  app.use(express.static(serverPublic));
}

// MongoDB холболт
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB холбогдлоо'))
  .catch(err => console.error('MongoDB холболтын алдаа:', err));

// Socket.io холболт
io.on('connection', (socket) => {
  console.log('Хэрэглэгч холбогдлоо:', socket.id);

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });
});

// Үндсэн хуудсыг автоматаар хайж буцаах
app.get('*', (req, res) => {
  const file1 = path.join(rootPublic, 'index.html');
  const file2 = path.join(serverPublic, 'index.html');

  if (fs.existsSync(file1)) {
    res.sendFile(file1);
  } else if (fs.existsSync(file2)) {
    res.sendFile(file2);
  } else {
    res.status(404).send('index.html файл олдсонгүй. Хавтасны бүтцээ шалгана уу.');
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Сервер ${PORT} дээр ажиллаж байна`));