const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Client файлуудыг static хэлбэрээр ачаалах (public эсвэл client хавтас)
app.use(express.static(path.join(__dirname, '../public'))); 
// Хэрэв client файлууд чинь 'client' хавтастай бол дээрхийг path.join(__dirname, '../client') болгоно.

// Датабэйс холболт
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB-тэй амжилттай холбогдлоо'))
  .catch(err => console.error('MongoDB холболтын алдаа:', err));

// Үндсэн хуудсыг ачаалах
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.io мессеж дамжуулах
io.on('connection', (socket) => {
  console.log('Хэрэглэгч холбогдлоо:', socket.id);

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });

  socket.on('disconnect', () => {
    console.log('Хэрэглэгч саллаа');
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Сервер ${PORT} порт дээр ажиллаж байна.`);
});