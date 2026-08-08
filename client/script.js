const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('loginOverlay');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendBtn');
    const messagesContainer = document.getElementById('chatBody');

    const partnerAvatar = document.getElementById('partnerAvatar');
    const partnerName = document.getElementById('partnerName');
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');

    let myRole = localStorage.getItem("userRole") || "";
    let isLogged = localStorage.getItem("isLoggedIn") === "true";
    let selectedReplyTo = null;

    // 🎵 Намуухан дуу үүсгэх функц (Web Audio API)
    function playSoftNotification() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine'; 
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 нот (зөөлөн)
            osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5 нот

            gain.gain.setValueAtTime(0.03, ctx.currentTime); // Дууны хэмжээ маш нам (3%)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {
            console.log("Audio error:", e);
        }
    }

    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    function scrollToBottom() {
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 50);
        }
    }

    if (isLogged && myRole) {
        if (loginOverlay) loginOverlay.style.display = 'none';
        socket.emit("user_connected", myRole);
    }

    function startChat() {
        const password = passwordInput ? passwordInput.value.trim() : '';
        const selectedRole = document.querySelector('input[name="userRole"]:checked')?.value || 'o';

        if (password === "") {
            if (errorMsg) errorMsg.textContent = 'Нууц үгээ оруулна уу!';
            return;
        }

        socket.emit("verify_password", { role: selectedRole, password: password });
    }

    if (loginBtn) loginBtn.onclick = startChat;
    window.startChat = startChat;

    socket.on("login_result", (result) => {
        if (result.success) {
            if (loginOverlay) loginOverlay.style.display = 'none';
            if (errorMsg) errorMsg.textContent = '';
            
            myRole = result.role;
            localStorage.setItem("userRole", myRole);
            localStorage.setItem("isLoggedIn", "true");

            socket.emit("user_connected", myRole);
            scrollToBottom();
        } else {
            if (errorMsg) errorMsg.textContent = result.message;
        }
    });

    socket.on("user_list", (onlineUsers) => {
        if (!myRole) return;

        const partnerRole = myRole === 'm' ? 'o' : 'm';
        const partnerDisplayName = partnerRole === 'm' ? 'М хэрэглэгч' : 'О хэрэглэгч';
        const isPartnerOnline = onlineUsers.includes(partnerRole);

        if (partnerAvatar) partnerAvatar.textContent = partnerRole.toUpperCase();
        if (partnerName) partnerName.textContent = partnerDisplayName;

        if (isPartnerOnline) {
            if (statusText) statusText.textContent = "Онлайн";
            if (statusDot) statusDot.className = "status-dot online";
        } else {
            if (statusText) statusText.textContent = "Оффлайн";
            if (statusDot) statusDot.className = "status-dot offline";
        }
    });

    socket.on('connect', () => {
        if (localStorage.getItem("isLoggedIn") === "true" && myRole) {
            socket.emit("user_connected", myRole);
        }
    });

    window.toggleSettingsMenu = function() {
        const menu = document.getElementById('settingsMenu');
        if (menu) menu.classList.toggle('active');
    };

    window.logout = function() {
        if (confirm("Чанаас гарахдаа итгэлтэй байна уу?")) {
            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("userRole");
            location.reload();
        }
    };

    window.openPwdModal = function() {
        document.getElementById('pwdModal').style.display = 'flex';
        const menu = document.getElementById('settingsMenu');
        if (menu) menu.classList.remove('active');
    };

    window.closePwdModal = function() {
        document.getElementById('pwdModal').style.display = 'none';
    };

    window.submitChangePassword = function() {
        const oldPwd = document.getElementById('oldPwd').value.trim();
        const newPwd = document.getElementById('newPwd').value.trim();

        if (!oldPwd || !newPwd) {
            alert("Нууц үгээ бүрэн оруулна уу!");
            return;
        }

        socket.emit("change_password", {
            role: myRole,
            oldPwd: oldPwd,
            newPwd: newPwd
        });
    };

    socket.on("change_password_result", (res) => {
        alert(res.message);
        if (res.success) {
            closePwdModal();
            document.getElementById('oldPwd').value = '';
            document.getElementById('newPwd').value = '';
        }
    });

    socket.on("previous_messages", (messages) => {
        if (!messagesContainer) return;
        messagesContainer.innerHTML = `<div class="system-notice"><span>🔒 Энэ бол зөвхөн М болон О талын тусгай чат юм</span></div>`;
        messages.forEach((msg) => renderMessage(msg));
        scrollToBottom();
    });

    socket.off("receive_message");
    socket.on("receive_message", (msg) => {
        renderMessage(msg);
        scrollToBottom();

        if (msg.sender !== myRole) {
            playSoftNotification();

            if (document.hidden && Notification.permission === "granted") {
                const senderTitle = msg.sender === 'm' ? 'М хэрэглэгч' : 'О хэрэглэгч';
                const notificationText = msg.image ? '📷 Зураг илгээлээ' : msg.message;
                new Notification(senderTitle, { body: notificationText, icon: 'logo.png' });
            }
        }
    });

    socket.on("update_message_reaction", ({ messageId, reactions }) => {
        const reactionBox = document.getElementById(`reactions-${messageId}`);
        if (reactionBox) reactionBox.innerHTML = renderReactionsHTML(reactions);
    });

    socket.on("message_deleted", (messageId) => {
        const elem = document.getElementById(`msg-${messageId}`);
        if (elem) elem.remove();
    });

    // ↩️ Reply сонгох
    window.setReply = function(msgId, sender, text) {
        selectedReplyTo = { id: msgId, sender: sender, text: text };
        if (messageInput) {
            messageInput.placeholder = `Хариу бичих (${sender.toUpperCase()}): "${text.substring(0, 15)}..."`;
            messageInput.focus();
        }
    };

    window.sendMessage = function() {
        if (!messageInput) return;
        const text = messageInput.value.trim();

        if (text !== '') {
            socket.emit('send_message', { 
                sender: myRole, 
                message: text,
                replyTo: selectedReplyTo 
            });
            messageInput.value = '';
            selectedReplyTo = null;
            messageInput.placeholder = "Мессеж бичих...";
        }
    };

    if (sendButton) sendButton.onclick = window.sendMessage;

    if (messageInput) {
        messageInput.onkeydown = function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        };
    }

    function renderMessage(msg) {
        if (!messagesContainer) return;

        const isSent = msg.sender === myRole;
        const msgRow = document.createElement("div");
        msgRow.className = `message-row ${isSent ? "sent" : "received"}`;
        msgRow.setAttribute("id", `msg-${msg._id}`);

        let contentHtml = "";

        if (msg.replyTo) {
            contentHtml += `<div style="font-size: 11px; opacity: 0.75; border-left: 2px solid #fff; padding-left: 6px; margin-bottom: 5px;">💬 ${msg.replyTo.sender.toUpperCase()}: ${msg.replyTo.text}</div>`;
        }

        if (msg.message) contentHtml += `<div>${msg.message}</div>`;
        if (msg.image) {
            contentHtml += `
                <div class="img-container">
                    <img src="${msg.image}" class="chat-img" alt="зураг" onclick="downloadImage('${msg.image}')" />
                </div>`;
        }

        const msgTextEscaped = (msg.message || '📷 Зураг').replace(/'/g, "\\'");

        msgRow.innerHTML = `
            <div class="bubble-wrapper">
                <div class="bubble">${contentHtml}</div>
                <div class="reaction-picker">
                    <button class="reaction-btn" title="Хариу бичих" onclick="setReply('${msg._id}', '${msg.sender}', '${msgTextEscaped}')">↩️</button>
                    <button class="reaction-btn" onclick="sendReaction('${msg._id}', '❤️')">❤️</button>
                    <button class="reaction-btn" onclick="sendReaction('${msg._id}', '😆')">😆</button>
                    <button class="reaction-btn" onclick="sendReaction('${msg._id}', '👍')">👍</button>
                    ${isSent ? `<button class="reaction-btn" title="Устгах" onclick="deleteMessage('${msg._id}')">🗑️</button>` : ''}
                </div>
            </div>
            <div class="reactions-badge" id="reactions-${msg._id}">
                ${renderReactionsHTML(msg.reactions)}
            </div>
        `;

        messagesContainer.appendChild(msgRow);
    }

    function renderReactionsHTML(reactions) {
        if (!reactions || Object.keys(reactions).length === 0) return "";
        const counts = {};
        Object.values(reactions).forEach(r => counts[r] = (counts[r] || 0) + 1);
        return Object.entries(counts).map(([r, count]) => `<span>${r} ${count > 1 ? count : ''}</span>`).join(" ");
    }

    window.sendReaction = function(messageId, reaction) {
        socket.emit("add_reaction", { messageId, reaction, username: myRole });
    };

    window.deleteMessage = function(messageId) {
        if (confirm("Энэ мессежийг устгах уу?")) {
            socket.emit("delete_message", messageId);
        }
    };
});