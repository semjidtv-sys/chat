const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e7 // 10MB зураг илгээх боломжтой
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// --- MongoDB Message Schema & Model ---
const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  image: String,
  replyTo: Object,
  reactions: { type: Map, of: String, default: {} },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// MongoDB Холболт
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB амжилттай холбогдлоо'))
    .catch(err => console.error('MongoDB холболтын алдаа:', err));
}

// Онлайн хэрэглэгчдийг хадгалах
const activeUsers = new Map();

// --- Socket.io Эвентүүд ---
io.on('connection', (socket) => {
  console.log('Шинэ хэрэглэгч холбогдлоо:', socket.id);

  // 1. Нууц үг шалгах logic
  socket.on('verify_password', ({ role, password }) => {
    const envPass = role === 'm' ? process.env.PASS_M : process.env.PASS_O;
    // .env дээр нууц үг байхгүй бол анхны утгаар шалгах
    const validPassword = envPass || (role === 'm' ? '1234' : '5678'); 

    if (password === validPassword) {
      socket.emit('login_result', { success: true, role });
    } else {
      socket.emit('login_result', { success: false, message: 'Нууц үг буруу байна!' });
    }
  });

  // 2. Хэрэглэгч холбогдох болон хуучин мессежүүдийг илгээх
  socket.on('user_connected', async (role) => {
    activeUsers.set(socket.id, role);
    io.emit('user_list', Array.from(activeUsers.values()));

    try {
      const messages = await Message.find().sort({ createdAt: 1 });
      socket.emit('previous_messages', messages);
    } catch (err) {
      console.error('Мессеж татахад алдаа гарлаа:', err);
    }
  });

  // 3. Бичиж байгаа төлөв (Typing indicator)
  socket.on('typing', (data) => {
    socket.broadcast.emit('display_typing', data);
  });

  // 4. Мессеж/Зураг хадгалах ба илгээх
  socket.on('send_message', async (data) => {
    try {
      const newMsg = new Message({
        sender: data.sender,
        message: data.message || '',
        image: data.image || null,
        replyTo: data.replyTo || null,
        reactions: {}
      });

      await newMsg.save();
      io.emit('receive_message', newMsg);
    } catch (err) {
      console.error('Мессеж хадгалахад алдаа:', err);
    }
  });

  // 5. Реакшн нэмэх
  socket.on('add_reaction', async ({ messageId, reaction, username }) => {
    try {
      const msg = await Message.findById(messageId);
      if (msg) {
        if (!msg.reactions) msg.reactions = new Map();
        msg.reactions.set(username, reaction);
        await msg.save();
        io.emit('update_message_reaction', { messageId, reactions: Object.fromEntries(msg.reactions) });
      }
    } catch (err) {
      console.error('Реакшн хадгалахад алдаа:', err);
    }
  });

  // 6. Мессеж устгах
  socket.on('delete_message', async (messageId) => {
    try {
      await Message.findByIdAndDelete(messageId);
      io.emit('message_deleted', messageId);
    } catch (err) {
      console.error('Устгахад алдаа:', err);
    }
  });

  // 7. Холболт тасрах
  socket.on('disconnect', () => {
    activeUsers.delete(socket.id);
    io.emit('user_list', Array.from(activeUsers.values()));
    console.log('Хэрэглэгч саллаа');
  });
});

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