const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);

// Socket.IO тохиргоо (CORS болон файлын хэмжээний хязгаар)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e7 // 10MB хүртэлх зураг/файл дамжуулах боломж
});

// 1. Client хавтас доторх static файлуудыг (HTML, CSS, JS, зураг) уншуулах
app.use(express.static(path.join(__dirname, "../client")));

// 2. Веб сайт руу ороход шууд login.html-ийг нээх
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/login.html"));
});

// MongoDB Холболт
const MONGO_URI = "mongodb+srv://semjidtv_db_user:NunRxnC9GsoPAqs3@cluster0.wmnucyt.mongodut.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB-тэй амжилттай холбогдлоо!");
    await initUsers();
  })
  .catch((err) => console.error("MongoDB холболтын алдаа:", err));

// Database Schemas & Models
const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  image: String,
  reactions: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  online: { type: Boolean, default: false }
});
const User = mongoose.model("User", userSchema);

// Хэрэглэгчийн дата шалгах / бэлдэх функц
async function initUsers() {
  try {
    const count = await User.countDocuments();
    console.log(`Баазад нийт ${count} хэрэглэгч байна.`);
  } catch (err) {
    console.error("User init алдаа:", err);
  }
}

// Онлайн хэрэглэгчдийг хадгалах объект
const connectedUsers = {};

// Socket.IO Чатын сүлжээний логик
io.on("connection", (socket) => {
  console.log("Шинэ хэрэглэгч холбогдлоо:", socket.id);

  // Өмнөх мессежүүдийг MongoDB-ээс татаж илгээх
  Message.find().sort({ createdAt: 1 }).limit(100)
    .then((messages) => {
      socket.emit("previous_messages", messages);
    })
    .catch((err) => console.error("Мессеж татахад алдаа гарлаа:", err));

  // Хэрэглэгч нэвтрэх үед
  socket.on("user_connected", (username) => {
    connectedUsers[socket.id] = username;
    io.emit("user_list", Object.values(connectedUsers));
    io.emit("system_message", `${username} чатад нэгдлээ.`);
  });

  // Мессеж хүлээн авч MongoDB-д хадгалах
  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message({
        sender: data.sender,
        message: data.message,
        image: data.image || null,
        reactions: data.reactions || {}
      });
      await newMessage.save();

      io.emit("receive_message", newMessage);
    } catch (err) {
      console.error("Мессеж хадгалахад алдаа гарлаа:", err);
    }
  });

  // Реакшн хадгалах
  socket.on("add_reaction", async ({ messageId, reaction, username }) => {
    try {
      const msg = await Message.findById(messageId);
      if (msg) {
        msg.reactions = msg.reactions || {};
        msg.reactions[username] = reaction;
        msg.markModified("reactions");
        await msg.save();
        io.emit("update_message_reaction", { messageId, reactions: msg.reactions });
      }
    } catch (err) {
      console.error("Реакшн засахад алдаа гарлаа:", err);
    }
  });

  // Хэрэглэгч гарахад
  socket.on("disconnect", () => {
    const username = connectedUsers[socket.id];
    if (username) {
      delete connectedUsers[socket.id];
      io.emit("user_list", Object.values(connectedUsers));
      io.emit("system_message", `${username} чатаас гарлаа.`);
    }
    console.log("Хэрэглэгч саллаа:", socket.id);
  });
});

// Render орчны эсвэл local 3000 портыг сонсох
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер ${PORT} порт дээр амжилттай ажиллаж байна.`);
});