const socket = io();

document.addEventListener("DOMContentLoaded", () => {
    const loginOverlay = document.getElementById("loginOverlay");
    const passwordInput = document.getElementById("passwordInput");
    const loginBtn = document.getElementById("loginBtn");
    const errorMsg = document.getElementById("errorMsg");
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");
    const imageInput = document.getElementById("imageInput");
    const messagesContainer = document.getElementById("messages");
    const statusBadge = document.getElementById("statusBadge");
    const typingIndicator = document.getElementById("typingIndicator");

    const replyPreview = document.getElementById("replyPreview");
    const replyUser = document.getElementById("replyUser");
    const replyText = document.getElementById("replyText");
    const cancelReplyBtn = document.getElementById("cancelReplyBtn");

    let myRole = localStorage.getItem("userRole") || "";
    let isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    let activeReply = null;
    let typingTimeout = null;

    if (isLoggedIn && myRole) {
        loginOverlay.style.display = "none";
        socket.emit("user_connected", myRole);
    }

    loginBtn.addEventListener("click", () => {
        const password = passwordInput.value.trim();
        const selectedRoleEl = document.querySelector('input[name="userRole"]:checked');
        const selectedRole = selectedRoleEl ? selectedRoleEl.value : "m";

        if (!password) {
            errorMsg.textContent = "Нууц үгээ оруулна уу!";
            return;
        }

        socket.emit("verify_password", { role: selectedRole, password: password });
    });

    socket.on("login_result", (result) => {
        if (result.success) {
            loginOverlay.style.display = "none";
            errorMsg.textContent = "";
            myRole = result.role;
            localStorage.setItem("userRole", myRole);
            localStorage.setItem("isLoggedIn", "true");
            socket.emit("user_connected", myRole);
        } else {
            errorMsg.textContent = result.message;
        }
    });

    socket.on("user_list", (users) => {
        const partnerRole = myRole === "m" ? "o" : "m";
        if (users.includes(partnerRole)) {
            statusBadge.textContent = "Нөгөө тал: Онлайн 🟢";
            statusBadge.classList.add("online");
        } else {
            statusBadge.textContent = "Нөгөө тал: Оффлайн 🔴";
            statusBadge.classList.remove("online");
        }
    });

    // --- Typing Status Logic ---
    messageInput.addEventListener("input", () => {
        socket.emit("typing", { sender: myRole, isTyping: true });

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit("typing", { sender: myRole, isTyping: false });
        }, 2000);
    });

    socket.on("display_typing", (data) => {
        if (data.sender !== myRole) {
            typingIndicator.style.display = data.isTyping ? "block" : "none";
        }
    });

    // --- Reply Logic ---
    window.setReply = (msgId, sender, text) => {
        activeReply = { msgId, sender, text };
        replyUser.textContent = `${sender.toUpperCase()} хэрэглэгчид хариулах:`;
        replyText.textContent = text || "[Зураг]";
        replyPreview.style.display = "flex";
        messageInput.focus();
    };

    cancelReplyBtn.addEventListener("click", () => {
        activeReply = null;
        replyPreview.style.display = "none";
    });

    // --- Send Message ---
    function sendTextMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        const payload = {
            sender: myRole,
            message: text,
            replyTo: activeReply
        };

        socket.emit("send_message", payload);
        socket.emit("typing", { sender: myRole, isTyping: false });

        messageInput.value = "";
        activeReply = null;
        replyPreview.style.display = "none";
    }

    sendBtn.addEventListener("click", sendTextMessage);
    messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendTextMessage();
        }
    });

    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            socket.emit("send_message", { sender: myRole, message: "", image: reader.result, replyTo: activeReply });
            activeReply = null;
            replyPreview.style.display = "none";
            imageInput.value = "";
        };
        reader.readAsDataURL(file);
    });

    function renderMessage(msg) {
        const isSent = msg.sender === myRole;
        const msgDiv = document.createElement("div");
        msgDiv.className = `message-item ${isSent ? "sent" : "received"}`;
        msgDiv.id = `msg-${msg._id}`;

        let html = `<span class="message-sender">${msg.sender.toUpperCase()} хэрэглэгч</span>`;
        
        html += `<div class="message-bubble">`;
        
        // Reply үзүүлэх хэсэг
        if (msg.replyTo) {
            html += `
                <div class="quoted-message">
                    <span class="quoted-user">${msg.replyTo.sender.toUpperCase()}</span>
                    <span>${escapeHtml(msg.replyTo.text)}</span>
                </div>
            `;
        }

        if (msg.message) html += `<div>${escapeHtml(msg.message)}</div>`;
        if (msg.image) html += `<img src="${msg.image}" alt="зураг" />`;
        html += `</div>`;

        html += `<div class="reactions-display" id="reactions-${msg._id}">${renderReactions(msg.reactions)}</div>`;
        html += `
            <div class="message-actions">
                <button onclick="setReply('${msg._id}', '${msg.sender}', '${escapeHtml(msg.message || 'Зураг')}')">↩️ Хариулах</button>
                <button onclick="sendReaction('${msg._id}', '❤️')">❤️</button>
                <button onclick="sendReaction('${msg._id}', '👍')">👍</button>
                ${isSent ? `<button onclick="deleteMsg('${msg._id}')">🗑️</button>` : ""}
            </div>
        `;

        msgDiv.innerHTML = html;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function renderReactions(reactions) {
        if (!reactions || Object.keys(reactions).length === 0) return "";
        const counts = {};
        Object.values(reactions).forEach(r => counts[r] = (counts[r] || 0) + 1);
        return Object.entries(counts).map(([r, count]) => `<span class="reaction-tag">${r} ${count}</span>`).join(" ");
    }

    function escapeHtml(str) {
        return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");
    }

    window.sendReaction = (messageId, reaction) => {
        socket.emit("add_reaction", { messageId, reaction, username: myRole });
    };

    window.deleteMsg = (messageId) => {
        if (confirm("Устгах уу?")) {
            socket.emit("delete_message", messageId);
        }
    };

    socket.on("previous_messages", (messages) => {
        messagesContainer.innerHTML = "";
        messages.forEach(renderMessage);
    });

    socket.on("receive_message", (msg) => {
        renderMessage(msg);
    });

    socket.on("message_deleted", (id) => {
        const el = document.getElementById(`msg-${id}`);
        if (el) el.remove();
    });

    socket.on("update_message_reaction", ({ messageId, reactions }) => {
        const el = document.getElementById(`reactions-${messageId}`);
        if (el) el.innerHTML = renderReactions(reactions);
    });
});