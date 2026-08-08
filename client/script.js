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

    let myRole = localStorage.getItem("userRole") || "m";
    let isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    let activeReply = null;
    let typingTimeout = null;

    if (isLoggedIn && myRole) {
        if (loginOverlay) loginOverlay.style.display = "none";
        socket.emit("user_connected", myRole);
    }

    if (loginBtn) {
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
    }

    socket.on("login_result", (result) => {
        if (result.success) {
            if (loginOverlay) loginOverlay.style.display = "none";
            if (errorMsg) errorMsg.textContent = "";
            myRole = result.role;
            localStorage.setItem("userRole", myRole);
            localStorage.setItem("isLoggedIn", "true");
            socket.emit("user_connected", myRole);
        } else {
            if (errorMsg) errorMsg.textContent = result.message;
        }
    });

    socket.on("user_list", (users) => {
        const partnerRole = myRole === "m" ? "o" : "m";
        if (statusBadge) {
            if (users.includes(partnerRole)) {
                statusBadge.textContent = "Нөгөө тал: Онлайн 🟢";
                statusBadge.classList.add("online");
            } else {
                statusBadge.textContent = "Нөгөө тал: Оффлайн 🔴";
                statusBadge.classList.remove("online");
            }
        }
    });

    if (messageInput) {
        messageInput.addEventListener("input", () => {
            socket.emit("typing", { sender: myRole, isTyping: true });
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                socket.emit("typing", { sender: myRole, isTyping: false });
            }, 2000);
        });
    }

    socket.on("display_typing", (data) => {
        if (data.sender !== myRole && typingIndicator) {
            typingIndicator.style.display = data.isTyping ? "block" : "none";
        }
    });

    window.setReply = (msgId, sender, text) => {
        activeReply = { msgId, sender, text };
        if (replyUser) replyUser.textContent = `${(sender || "хэрэглэгч").toUpperCase()} хэрэглэгчид хариулах:`;
        if (replyText) replyText.textContent = text || "[Зураг]";
        if (replyPreview) replyPreview.style.display = "flex";
        if (messageInput) messageInput.focus();
    };

    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener("click", () => {
            activeReply = null;
            if (replyPreview) replyPreview.style.display = "none";
        });
    }

    function sendTextMessage() {
        if (!messageInput) return;
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
        if (replyPreview) replyPreview.style.display = "none";
    }

    if (sendBtn) sendBtn.addEventListener("click", sendTextMessage);
    if (messageInput) {
        messageInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                sendTextMessage();
            }
        });
    }

    if (imageInput) {
        imageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                socket.emit("send_message", { sender: myRole, message: "", image: reader.result, replyTo: activeReply });
                activeReply = null;
                if (replyPreview) replyPreview.style.display = "none";
                imageInput.value = "";
            };
            reader.readAsDataURL(file);
        });
    }

    function renderReactionsHtml(reactions) {
        if (!reactions) return "";
        let entries = [];
        if (reactions instanceof Map) {
            entries = Array.from(reactions.entries());
        } else if (typeof reactions === "object") {
            entries = Object.entries(reactions);
        }
        if (entries.length === 0) return "";

        const counts = {};
        entries.forEach(([user, emoji]) => {
            counts[emoji] = (counts[emoji] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([emoji, count]) => `<span class="reaction-tag" style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 10px; margin-right: 4px; font-size: 12px;">${emoji} ${count}</span>`)
            .join(" ");
    }

    function renderMessage(msg) {
        if (!msg || !messagesContainer) return;
        const senderName = msg.sender ? String(msg.sender) : "m";
        const isSent = senderName === myRole;

        const msgDiv = document.createElement("div");
        msgDiv.className = `message-item ${isSent ? "sent" : "received"}`;
        msgDiv.id = `msg-${msg._id}`;

        let html = `<span class="message-sender" style="font-size: 11px; opacity: 0.7; display: block; margin-bottom: 2px;">${senderName.toUpperCase()} хэрэглэгч</span>`;
        html += `<div class="message-bubble">`;

        if (msg.replyTo) {
            const rSender = msg.replyTo.sender ? String(msg.replyTo.sender) : "";
            html += `
                <div class="quoted-message" style="background: rgba(0,0,0,0.2); border-left: 3px solid #0084ff; padding: 4px 8px; margin-bottom: 5px; border-radius: 4px; font-size: 12px;">
                    <span class="quoted-user" style="font-weight: bold; display: block;">${rSender.toUpperCase()}</span>
                    <span>${escapeHtml(msg.replyTo.text)}</span>
                </div>
            `;
        }

        if (msg.message) html += `<div>${escapeHtml(msg.message)}</div>`;
        if (msg.image) html += `<img src="${msg.image}" alt="зураг" style="max-width: 200px; border-radius: 8px; margin-top: 5px;" />`;
        html += `</div>`;

        // Реакшн харуулах хэсэг
        html += `<div class="reactions-display" id="reactions-${msg._id}" style="margin-top: 4px;">${renderReactionsHtml(msg.reactions)}</div>`;

        // Үйлдэх товчлуурууд болон Эможи реакшнууд
        html += `
            <div class="message-actions" style="margin-top: 4px; display: flex; gap: 6px; font-size: 13px;">
                <button onclick="setReply('${msg._id}', '${senderName}', '${escapeHtml(msg.message || 'Зураг')}')" style="background:none; border:none; cursor:pointer; color:#bbb;">↩️</button>
                <button onclick="sendReaction('${msg._id}', '❤️')" style="background:none; border:none; cursor:pointer;">❤️</button>
                <button onclick="sendReaction('${msg._id}', '👍')" style="background:none; border:none; cursor:pointer;">👍</button>
                <button onclick="sendReaction('${msg._id}', '😂')" style="background:none; border:none; cursor:pointer;">😂</button>
                <button onclick="sendReaction('${msg._id}', '😮')" style="background:none; border:none; cursor:pointer;">😮</button>
                ${isSent ? `<button onclick="deleteMsg('${msg._id}')" style="background:none; border:none; cursor:pointer; color:#ff4d4d;">🗑️</button>` : ""}
            </div>
        `;

        msgDiv.innerHTML = html;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        if (messagesContainer) {
            messagesContainer.innerHTML = "";
            if (Array.isArray(messages)) messages.forEach(renderMessage);
        }
    });

    socket.on("receive_message", (msg) => {
        renderMessage(msg);
    });

    socket.on("message_deleted", (id) => {
        const el = document.getElementById(`msg-${id}`);
        if (el) el.remove();
    });

    socket.on("update_message_reaction", ({ messageId, reaction, username }) => {
        const el = document.getElementById(`reactions-${messageId}`);
        if (el) {
            // Шууд дэлгэцэнд реакшн тэмдэгтийг нэмнэ
            el.innerHTML = `<span class="reaction-tag" style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 10px; margin-right: 4px; font-size: 12px;">${reaction} 1</span>`;
        }
    });
});