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

// Client хавтасны замыг тодорхойлох (server хавтаснаас нэг шат дээшилнэ)
const clientPath = path.join(__dirname, '../client');

// Client хавтас доторх бүх статик файлуудыг (index.html, style.css, script.js гэх мэт) ачаалах
app.use(express.static(clientPath));

// MongoDB Холболт
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB амжилттай холбогдлоо'))
    .catch(err => console.error('MongoDB холболтын алдаа:', err));
} else {
  console.log('MONGODB_URI тохируулагдаагүй байна.');
}

// Socket.io холболт
io.on('connection', (socket) => {
  console.log('Хэрэглэгч холбогдлоо:', socket.id);

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });

  socket.on('disconnect', () => {
    console.log('Хэрэглэгч саллаа');
  });
});

// Бусад бүх хүсэлтэд client/index.html-ийг буцаах
app.get('*', (req, res) => {
  const indexPath = path.join(clientPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('client/index.html файл олдсонгүй!');
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Сервер ${PORT} порт дээр ажиллаж байна.`));