const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e7
});

app.use(express.static(path.join(__dirname, "../client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

const MONGO_URI = "mongodb+srv://semjidtv_db_user:NunRxnC9GsoPAqs3@cluster0.wmnucyt.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🍃 MongoDB-тэй амжилттай холбогдлоо!"))
  .catch((err) => console.error("MongoDB холболтын алдаа:", err));

// 1. Мессежийн модел (limit-гүй, replyTo нэмэгдсэн)
const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  image: String,
  replyTo: { type: Object, default: null },
  reactions: { type: Object, default: {} },
  isEdited: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

// 2. Хэрэглэгчийн модел
const userSchema = new mongoose.Schema({
  role: String,
  password: String
});
const User = mongoose.model("User", userSchema, "users");

const connectedUsers = {};

io.on("connection", (socket) => {
  // Бүх мессежийг лимитгүйгээр цувраагаар татна
  Message.find().sort({ createdAt: 1 })
    .then((messages) => socket.emit("previous_messages", messages))
    .catch((err) => console.error(err));

  // Нууц үг шалгах
  socket.on("verify_password", async ({ role, password }) => {
    try {
      const user = await User.findOne({ role: role, password: password });
      if (user) {
        socket.emit("login_result", { success: true, role: role });
      } else {
        socket.emit("login_result", { success: false, message: "Нууц үг буруу байна!" });
      }
    } catch (err) {
      console.error(err);
      socket.emit("login_result", { success: false, message: "Серверийн алдаа гарлаа!" });
    }
  });

  // Нууц үг солих эвент
  socket.on("change_password", async ({ role, oldPwd, newPwd }) => {
    try {
      const user = await User.findOne({ role: role, password: oldPwd });
      if (user) {
        user.password = newPwd;
        await user.save();
        socket.emit("change_password_result", { success: true, message: "Нууц үг амжилттай солигдлоо!" });
      } else {
        socket.emit("change_password_result", { success: false, message: "Хуучин нууц үг буруу байна!" });
      }
    } catch (err) {
      console.error(err);
      socket.emit("change_password_result", { success: false, message: "Алдаа гарлаа!" });
    }
  });

  socket.on("user_connected", (username) => {
    connectedUsers[socket.id] = username;
    io.emit("user_list", Object.values(connectedUsers));
  });

  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message({
        sender: data.sender,
        message: data.message,
        image: data.image || null,
        replyTo: data.replyTo || null,
        reactions: {}
      });
      await newMessage.save();
      io.emit("receive_message", newMessage);
    } catch (err) { console.error(err); }
  });

  socket.on("delete_message", async (messageId) => {
    try {
      await Message.findByIdAndDelete(messageId);
      io.emit("message_deleted", messageId);
    } catch (err) { console.error(err); }
  });

  socket.on("add_reaction", async ({ messageId, reaction, username }) => {
    try {
      const msg = await Message.findById(messageId);
      if (msg) {
        msg.reactions = msg.reactions || {};
        if (msg.reactions[username] === reaction) {
          delete msg.reactions[username];
        } else {
          msg.reactions[username] = reaction;
        }
        msg.markModified("reactions");
        await msg.save();
        io.emit("update_message_reaction", { messageId, reactions: msg.reactions });
      }
    } catch (err) { console.error(err); }
  });

  socket.on("disconnect", () => {
    delete connectedUsers[socket.id];
    io.emit("user_list", Object.values(connectedUsers));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер ажиллаж байна: http://localhost:${PORT}`);
});