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

const MONGO_URI = "mongodb+srv://semjidtv_db_user:NunRxnC9GsoPAqs3@cluster0.wmnucyt.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("🍃 MongoDB-тэй амжилттай холбогдлоо!");
        await initUsers();
    })
    .catch((err) => console.error("MongoDB холболтын алдаа:", err));

const messageSchema = new mongoose.Schema({
    sender: String,
    message: String,
    image: String,
    reactions: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

const userSchema = new mongoose.Schema({
    role: { type: String, unique: true },
    password: String
});
const User = mongoose.model("User", userSchema);

async function initUsers() {
    const count = await User.countDocuments();
    if (count === 0) {
        await User.create([
            { role: "m", password: "M8804@8862" },
            { role: "o", password: "O8804@8071" }
        ]);
    }
}

let activeUsers = { m: null, o: null };

const clientPath = path.join(__dirname, "../client");
app.use(express.static(clientPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
});

io.on("connection", (socket) => {

    socket.on("join_room", async ({ role, password }) => {
        const user = await User.findOne({ role });

        if (!user || user.password !== password) {
            return socket.emit("login_result", { 
                success: false, 
                message: " Үгүй ээ, мартах ч гэж дээ! 🥺 Би хэзээ ч чамайг мартахгүй шүү. " 
            });
        }

        socket.role = role;
        activeUsers[role] = socket.id;
        socket.emit("login_result", { success: true });

        try {
            const history = await Message.find().sort({ createdAt: 1 }).limit(100);
            socket.emit("load_history", history);
        } catch (err) {
            console.error("Мессеж татахад алдаа гарлаа:", err);
        }

        const otherRole = role === "m" ? "o" : "m";
        if (activeUsers[otherRole]) {
            socket.emit("partner_status", { role: otherRole, online: true });
            io.to(activeUsers[otherRole]).emit("partner_status", { role: role, online: true });
        } else {
            socket.emit("partner_status", { role: otherRole, online: false });
        }
    });

    socket.on("change_password", async ({ oldPassword, newPassword }) => {
        if (!socket.role) return;
        try {
            const user = await User.findOne({ role: socket.role });
            if (!user || user.password !== oldPassword) {
                return socket.emit("password_change_result", { success: false, message: "Одоогийн нууц үг буруу байна!" });
            }
            user.password = newPassword;
            await user.save();
            socket.emit("password_change_result", { success: true, message: "Нууц үг амжилттай солигдлоо!" });
        } catch (err) {
            socket.emit("password_change_result", { success: false, message: "Серверийн алдаа гарлаа." });
        }
    });

    socket.on("send_message", async (data) => {
        if (!socket.role) return;

        try {
            const newMessage = new Message({
                sender: socket.role,
                message: data.message || "",
                image: data.image || null,
                reactions: {}
            });
            const savedMsg = await newMessage.save();

            const msgData = {
                id: savedMsg._id.toString(),
                message: savedMsg.message,
                image: savedMsg.image,
                sender: socket.role,
                reactions: {}
            };

            socket.emit("message_sent_confirm", msgData);

            const otherRole = socket.role === "m" ? "o" : "m";
            const partnerSocketId = activeUsers[otherRole];
            if (partnerSocketId) {
                io.to(partnerSocketId).emit("receive_message", msgData);
            }
        } catch (err) {
            console.error("Мессеж хадгалахад алдаа гарлаа:", err);
        }
    });

    socket.on("typing", () => {
        const otherRole = socket.role === "m" ? "o" : "m";
        if (activeUsers[otherRole]) {
            io.to(activeUsers[otherRole]).emit("partner_typing", { isTyping: true });
        }
    });

    socket.on("stop_typing", () => {
        const otherRole = socket.role === "m" ? "o" : "m";
        if (activeUsers[otherRole]) {
            io.to(activeUsers[otherRole]).emit("partner_typing", { isTyping: false });
        }
    });

    socket.on("add_reaction", async ({ messageId, emoji }) => {
        try {
            const msg = await Message.findById(messageId);
            if (msg) {
                const reactions = msg.reactions || {};
                reactions[socket.role] = emoji;
                msg.reactions = reactions;
                msg.markModified("reactions");
                await msg.save();

                io.emit("reaction_updated", { 
                    messageId, 
                    reactions: msg.reactions 
                });
            }
        } catch (err) {
            console.error("Реакц нэмэхэд алдаа гарлаа:", err);
        }
    });

    socket.on("edit_message", async ({ messageId, newText }) => {
        try {
            await Message.findByIdAndUpdate(messageId, { message: newText });
            io.emit("message_edited", { messageId, newText });
        } catch (err) {
            console.error("Засахад алдаа гарлаа:", err);
        }
    });

    socket.on("delete_message", async ({ messageId }) => {
        try {
            await Message.findByIdAndDelete(messageId);
            io.emit("message_deleted", { messageId });
        } catch (err) {
            console.error("Устгахад алдаа гарлаа:", err);
        }
    });

    socket.on("disconnect", () => {
        if (socket.role && activeUsers[socket.role] === socket.id) {
            activeUsers[socket.role] = null;

            const otherRole = socket.role === "m" ? "o" : "m";
            if (activeUsers[otherRole]) {
                io.to(activeUsers[otherRole]).emit("partner_status", { 
                    role: socket.role, 
                    online: false 
                });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер ажиллаж байна: http://localhost:${PORT}`);
});