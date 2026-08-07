require("dotenv").config();

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
  res.sendFile(path.join(__dirname, "../client/login.html"));
});

const MONGO_URI = "mongodb+srv://semjidtv_db_user:NunRxnC9GsoPAqs3@cluster0.wmnucyt.mongodb.net/?appName=Cluster0";

if (!MONGO_URI) {
  console.error("❌ MONGO_URI тохируулагдаагүй байна! server/.env файл үүсгэж MONGO_URI-г тодорхойлно уу (жишээг server/.env.example-с харна уу).");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("🍃 MongoDB-тэй амжилттай холбогдлоо!"))
  .catch((err) => console.error("MongoDB холболтын алдаа:", err));

const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  image: String,
  reactions: { type: Object, default: {} },
  isEdited: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

const connectedUsers = {};

io.on("connection", (socket) => {
  Message.find().sort({ createdAt: 1 }).limit(100)
    .then((messages) => socket.emit("previous_messages", messages))
    .catch((err) => console.error(err));

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

  socket.on("edit_message", async ({ messageId, newMessage }) => {
    try {
      const msg = await Message.findByIdAndUpdate(
        messageId, 
        { message: newMessage, isEdited: true }, 
        { new: true }
      );
      io.emit("message_edited", msg);
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