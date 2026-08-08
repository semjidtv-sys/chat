const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 1. MongoDB холболт
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://admin:admin123@cluster0.example.mongodb.net/private_chat?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB амжилттай холбогдлоо."))
    .catch((err) => console.error("MongoDB холболтын алдаа:", err));

// 2. Мессежийн Загвар (Schema)
const messageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    message: { type: String, default: "" },
    image: { type: String, default: null },
    reactions: { type: Map, of: String, default: {} },
    replyTo: {
        msgId: String,
        sender: String,
        text: String
    },
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

// 3. Статик файлуудын замыг засах (client хавтас гадна талд байгаа тул "../client" гэж дуудна)
app.use(express.static(path.join(__dirname, "../client")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "index.html"));
});

// 4. Нууц үг ба хэрэглэгчийн тохиргоо
const PASSWORDS = {
    m: process.env.PASSWORD_M || "1234",
    o: process.env.PASSWORD_O || "1234"
};

const activeUsers = {};

// 5. Socket.IO Холболт
io.on("connection", (socket) => {
    // Нууц үг шалгах
    socket.on("verify_password", ({ role, password }) => {
        if (PASSWORDS[role] && PASSWORDS[role] === password) {
            socket.emit("login_result", { success: true, role: role });
        } else {
            socket.emit("login_result", { success: false, message: "Нууц үг буруу байна!" });
        }
    });

    // Хэрэглэгч холбогдох
    socket.on("user_connected", async (role) => {
        activeUsers[socket.id] = role;
        io.emit("user_list", Object.values(activeUsers));

        try {
            const previousMessages = await Message.find().sort({ createdAt: 1 }).limit(100);
            socket.emit("previous_messages", previousMessages);
        } catch (err) {
            console.error("Түүх татахад алдаа гарлаа:", err);
        }
    });

    // Бичиж байна (Typing) статус
    socket.on("typing", (data) => {
        socket.broadcast.emit("display_typing", data);
    });

    // Мессеж хүлээн авах ба илгээх
    socket.on("send_message", async (data) => {
        try {
            const newMsg = new Message({
                sender: data.sender,
                message: data.message || "",
                image: data.image || null,
                replyTo: data.replyTo || null
            });

            await newMsg.save();
            io.emit("receive_message", newMsg);
        } catch (err) {
            console.error("Мессеж хадгалахад алдаа гарлаа:", err);
        }
    });

    // Эможи Reaction нэмэх
    socket.on("add_reaction", async ({ messageId, reaction, username }) => {
        try {
            const msg = await Message.findById(messageId);
            if (msg) {
                if (!msg.reactions) msg.reactions = new Map();
                msg.reactions.set(username, reaction);
                await msg.save();

                io.emit("update_message_reaction", {
                    messageId: msg._id,
                    reactions: Object.fromEntries(msg.reactions)
                });
            }
        } catch (err) {
            console.error("Рекшн хадгалахад алдаа гарлаа:", err);
        }
    });

    // Мессеж устгах
    socket.on("delete_message", async (messageId) => {
        try {
            await Message.findByIdAndDelete(messageId);
            io.emit("message_deleted", messageId);
        } catch (err) {
            console.error("Мессеж устгахад алдаа гарлаа:", err);
        }
    });

    // Холболт салсан үед
    socket.on("disconnect", () => {
        delete activeUsers[socket.id];
        io.emit("user_list", Object.values(activeUsers));
    });
});

// 6. Сервер асаах
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер ${PORT} порт дээр ажиллаж байна.`);
});