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
  maxHttpBufferSize: 1e7
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// MongoDB Schemas
const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  image: String,
  replyTo: Object,
  reactions: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  role: { type: String, unique: true },
  password: String
});

const Message = mongoose.model('Message', messageSchema);
const User = mongoose.model('User', userSchema);

// MongoDB Холболт & Анхны хэрэглэгчдийг үүсгэх
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log('MongoDB амжилттай холбогдлоо');
      // Анхны нууц үг үүсгэх
      const mUser = await User.findOne({ role: 'm' });
      if (!mUser) await new User({ role: 'm', password: process.env.PASS_M || '1234' }).save();
      const oUser = await User.findOne({ role: 'o' });
      if (!oUser) await new User({ role: 'o', password: process.env.PASS_O || '5678' }).save();
    })
    .catch(err => console.error('MongoDB холболтын алдаа:', err));
}

const activeUsers = new Map();

io.on('connection', (socket) => {
  // 1. Нууц үг шалгах
  socket.on('verify_password', async ({ role, password }) => {
    try {
      let user = null;
      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ role });
      }
      const validPassword = user ? user.password : (role === 'm' ? '1234' : '5678');

      if (password === validPassword) {
        socket.emit('login_result', { success: true, role });
      } else {
        socket.emit('login_result', { success: false, message: 'Нууц үг буруу байна!' });
      }
    } catch (e) {
      socket.emit('login_result', { success: false, message: 'Серверийн алдаа!' });
    }
  });

  // 2. Нууц үг өөрчлөх
  socket.on('change_password', async ({ role, oldPassword, newPassword }) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const user = await User.findOne({ role });
        if (user && user.password === oldPassword) {
          user.password = newPassword;
          await user.save();
          socket.emit('change_password_result', { success: true, message: 'Нууц үг амжилттай солигдлоо!' });
        } else {
          socket.emit('change_password_result', { success: false, message: 'Хуучин нууц үг буруу байна!' });
        }
      } else {
        socket.emit('change_password_result', { success: false, message: 'Баазтай холбогдоогүй байна!' });
      }
    } catch (err) {
      socket.emit('change_password_result', { success: false, message: 'Алдаа гарлаа!' });
    }
  });

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

  socket.on('typing', (data) => {
    socket.broadcast.emit('display_typing', data);
  });

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

    io.emit('receive_message', msgData);

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
      console.error('Реакшн алдаа:', err);
    }
  });

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