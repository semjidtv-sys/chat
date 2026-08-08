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

// Schema & Model
const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  image: String,
  replyTo: Object,
  reactions: { type: Object, default: {} },
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

const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('Шинэ хэрэглэгч холбогдлоо:', socket.id);

  // 1. Нууц үг шалгах
  socket.on('verify_password', ({ role, password }) => {
    const envPass = role === 'm' ? process.env.PASS_M : process.env.PASS_O;
    const validPassword = envPass || (role === 'm' ? '1234' : '5678'); 

    if (password === validPassword) {
      socket.emit('login_result', { success: true, role });
    } else {
      socket.emit('login_result', { success: false, message: 'Нууц үг буруу байна!' });
    }
  });

  // 2. Хэрэглэгч холбогдох
  socket.on('user_connected', async (role) => {
    activeUsers.set(socket.id, role);
    io.emit('user_list', Array.from(activeUsers.values()));

    try {
      if (mongoose.connection.readyState === 1) {
        const messages = await Message.find().sort({ createdAt: 1 });
        socket.emit('previous_messages', messages);
      }
    } catch (err) {
      console.error('Мессеж татахад алдаа:', err);
    }
  });

  // 3. Бичиж байна...
  socket.on('typing', (data) => {
    socket.broadcast.emit('display_typing', data);
  });

  // 4. Мессеж эсвэл зураг илгээх
  socket.on('send_message', async (data) => {
    const msgData = {
      _id: new mongoose.Types.ObjectId().toString(),
      sender: data.sender || 'm',
      message: data.message || '',
      image: data.image || null,
      replyTo: data.replyTo || null,
      reactions: {},
      createdAt: new Date()
    };

    // Шууд бүх холбогдсон хэрэглэгчид илгээнэ
    io.emit('receive_message', msgData);

    // Баазад хадгалах
    try {
      if (mongoose.connection.readyState === 1) {
        const newMsg = new Message({
          _id: msgData._id,
          sender: msgData.sender,
          message: msgData.message,
          image: msgData.image,
          replyTo: msgData.replyTo,
          reactions: {}
        });
        await newMsg.save();
      }
    } catch (err) {
      console.error('Баазад хадгалахад алдаа:', err);
    }
  });

  // 5. Эможи Реакшн нэмэх
  socket.on('add_reaction', async ({ messageId, reaction, username }) => {
    io.emit('update_message_reaction', { messageId, reaction, username });

    try {
      if (mongoose.connection.readyState === 1) {
        const msg = await Message.findById(messageId);
        if (msg) {
          if (!msg.reactions) msg.reactions = {};
          msg.reactions[username] = reaction;
          msg.markModified('reactions');
          await msg.save();
        }
      }
    } catch (err) {
      console.error('Реакшн хадгалахад алдаа:', err);
    }
  });

  // 6. Мессеж устгах
  socket.on('delete_message', async (messageId) => {
    io.emit('message_deleted', messageId);
    try {
      if (mongoose.connection.readyState === 1) {
        await Message.findByIdAndDelete(messageId);
      }
    } catch (err) {
      console.error('Устгахад алдаа:', err);
    }
  });

  socket.on('disconnect', () => {
    activeUsers.delete(socket.id);
    io.emit('user_list', Array.from(activeUsers.values()));
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