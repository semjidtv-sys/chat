const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// public хавтасны файлуудыг ачаалах
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB холболт
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI Environment Variable тохируулагдаагүй байна!");
} else {
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

// Үндсэн хуудсыг буцаах
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'), (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'public/index.html'));
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Сервер ${PORT} порт дээр ажиллаж байна.`));