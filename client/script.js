const socket = io("https://chat-tkqr.onrender.com");

let currentRole = null;
let editingMessageId = null;

// 1. Нэвтрэх функц
function startChat() {
    const role = document.querySelector('input[name="userRole"]:checked').value;
    const password = document.getElementById("passwordInput").value;
    const errorMsgElement = document.getElementById("errorMsg");

    if (!password) {
        if (errorMsgElement) errorMsgElement.innerText = "Нууц үгээ оруулна уу!";
        return;
    }

    currentRole = role;
    socket.emit("join_room", { role, password });
}

// Серверээс нэвтрэх хариу ирэх үед
socket.on("login_result", (data) => {
    if (data.success) {
        document.getElementById("loginOverlay").style.display = "none";
        
        // Нэвтэрсэн хэрэглэгчийн мэдээллийг тохируулах
        const partnerName = document.getElementById("partnerName");
        const partnerAvatar = document.getElementById("partnerAvatar");
        
        if (partnerName) {
            partnerName.innerText = currentRole === "m" ? "О хэрэглэгч" : "М хэрэглэгч";
        }
        if (partnerAvatar) {
            partnerAvatar.innerText = currentRole === "m" ? "О" : "М";
        }
    } else {
        // Серверээс ирсэн мессежийг дэлгэцэнд харуулна
        const errorMsgElement = document.getElementById("errorMsg");
        if (errorMsgElement) {
            errorMsgElement.innerText = data.message;
        }
    }
});

// 2. Мессеж илгээх функц
function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();

    if (editingMessageId) {
        if (text) {
            socket.emit("edit_message", { messageId: editingMessageId, newText: text });
            editingMessageId = null;
            input.value = "";
        }
        return;
    }

    if (text) {
        socket.emit("send_message", { message: text });
        input.value = "";
        socket.emit("stop_typing");
    }
}

// Энтер товч дарахад мессеж илгээх
document.getElementById("messageInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    } else {
        socket.emit("typing");
    }
});

document.getElementById("messageInput")?.addEventListener("keyup", () => {
    setTimeout(() => {
        socket.emit("stop_typing");
    }, 2000);
});

// Зураг илгээх
function sendImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            socket.emit("send_message", { image: e.target.result });
        };
        reader.readAsDataURL(file);
    }
}

// 3. Серверээс ирэх эвентүүд
socket.on("load_history", (messages) => {
    const chatBody = document.getElementById("chatBody");
    chatBody.innerHTML = '<div class="system-notice"><span id="greetingText">🔒 Энэ бол зөвхөн М болон О талын тусгай чат юм</span></div>';
    messages.forEach(appendMessage);
    scrollToBottom();
});

socket.on("receive_message", (msg) => {
    appendMessage(msg);
    scrollToBottom();
});

socket.on("message_sent_confirm", (msg) => {
    appendMessage(msg);
    scrollToBottom();
});

socket.on("partner_status", ({ online }) => {
    const statusText = document.getElementById("statusText");
    const statusDot = document.getElementById("statusDot");
    
    if (statusText) statusText.innerText = online ? "Онлайн" : "Оффлайн";
    if (statusDot) {
        statusDot.className = `status-dot ${online ? "online" : "offline"}`;
    }
});

socket.on("partner_typing", ({ isTyping }) => {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) {
        indicator.style.display = isTyping ? "block" : "none";
    }
});

// 4. Мессеж засах / устгах / реакц
socket.on("message_edited", ({ messageId, newText }) => {
    const msgEl = document.querySelector(`[data-id="${messageId}"] .message-text`);
    if (msgEl) msgEl.innerText = newText;
});

socket.on("message_deleted", ({ messageId }) => {
    const msgEl = document.querySelector(`[data-id="${messageId}"]`);
    if (msgEl) msgEl.remove();
});

socket.on("reaction_updated", ({ messageId, reactions }) => {
    const reactionEl = document.querySelector(`[data-id="${messageId}"] .reactions`);
    if (reactionEl) {
        reactionEl.innerHTML = Object.values(reactions).join(" ");
    }
});

// 5. Дэлгэцэнд мессеж нэмэх туслах функц
function appendMessage(msg) {
    const chatBody = document.getElementById("chatBody");
    const isMe = msg.sender === currentRole;
    
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${isMe ? "outgoing" : "incoming"}`;
    msgDiv.setAttribute("data-id", msg.id || msg._id);

    let content = "";
    if (msg.message) content += `<div class="message-text">${msg.message}</div>`;
    if (msg.image) content += `<img src="${msg.image}" class="message-img" style="max-width:200px; border-radius:10px;">`;
    
    const reactionsList = msg.reactions ? Object.values(msg.reactions).join(" ") : "";
    content += `<div class="reactions">${reactionsList}</div>`;

    msgDiv.innerHTML = content;
    chatBody.appendChild(msgDiv);
}

function scrollToBottom() {
    const chatBody = document.getElementById("chatBody");
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
}

// 6. Нууц үг солих модал функцүүд
function openPwdModal() {
    document.getElementById("pwdModal").style.display = "flex";
}

function closePwdModal() {
    document.getElementById("pwdModal").style.display = "none";
}

function submitChangePassword() {
    const oldPassword = document.getElementById("oldPwd").value;
    const newPassword = document.getElementById("newPwd").value;

    if (!oldPassword || !newPassword) {
        alert("Бүх талбарыг бөгөлнө үү!");
        return;
    }

    socket.emit("change_password", { oldPassword, newPassword });
}

socket.on("password_change_result", (data) => {
    alert(data.message);
    if (data.success) {
        closePwdModal();
        document.getElementById("oldPwd").value = "";
        document.getElementById("newPwd").value = "";
    }
});