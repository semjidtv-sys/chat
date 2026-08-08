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

// Боломжит бүх хавтаснаас CSS, JS, Зургуудыг ачаалах
app.use(express.static(path.join(__dirname, '..')));              // Root хавтас
app.use(express.static(path.join(__dirname, '../public')));       // Root/public хавтас
app.use(express.static(path.join(__dirname, 'public')));          // Server/public хавтас

// MongoDB холболт
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB амжилттай холбогдлоо'))
    .catch(err => console.error('MongoDB холболтын алдаа:', err));
}

// Socket.io холболт
io.on('connection', (socket) => {
  console.log('Хэрэглэгч холбогдлоо:', socket.id);

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });
});

// index.html файлыг бүх боломжит байршлаас хайж буцаах
app.get('*', (req, res) => {
  const possiblePaths = [
    path.join(__dirname, '../index.html'),        // Root дотор байгаа бол
    path.join(__dirname, '../public/index.html'), // Root/public дотор байгаа бол
    path.join(__dirname, 'public/index.html'),    // Server/public дотор байгаа бол
    path.join(__dirname, 'index.html')            // Server дотор байгаа бол
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }

  res.status(404).send('index.html файл бүх байршилд олдсонгүй.');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Сервер ${PORT} порт дээр ажиллаж байна.`));