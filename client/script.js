const socket = io();

// 🔑 ТОХИРУУЛАХ НҮУЦ ҮГ
const SECRET_PASSWORD = "1234"; 

// Socket холболтын төлөв
socket.on('connect', () => {
    const badge = document.getElementById('statusBadge');
    if (badge) {
        badge.textContent = 'Онлайн';
        badge.classList.add('online');
    }
});

socket.on('disconnect', () => {
    const badge = document.getElementById('statusBadge');
    if (badge) {
        badge.textContent = 'Оффлайн';
        badge.classList.remove('online');
    }
});

socket.on('chat message', (data) => displayMessage(data));
socket.on('message', (data) => displayMessage(data));

// DOM уншигдсаны дараа
document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('loginOverlay');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    // Нэвтрэх функц
    function startChat() {
        const inputVal = passwordInput ? passwordInput.value.trim() : '';

        if (inputVal === SECRET_PASSWORD) {
            loginOverlay.style.display = 'none';
            errorMsg.textContent = '';
        } else if (inputVal === "") {
            errorMsg.textContent = 'Нууц үгээ оруулна уу!';
        } else {
            errorMsg.textContent = 'Нууц үг буруу байна!';
        }
    }

    if (loginBtn) loginBtn.addEventListener('click', startChat);

    // Мессеж илгээх функц
    function sendMessage() {
        if (!messageInput) return;
        const text = messageInput.value.trim();
        if (text !== '') {
            socket.emit('chat message', { text: text, timestamp: new Date() });
            messageInput.value = '';
        }
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    // Enter товч
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (loginOverlay && loginOverlay.style.display !== 'none') {
                startChat();
            } else {
                sendMessage();
            }
        }
    });
});

// Мессеж дэлгэцэнд оруулах
function displayMessage(data) {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.textContent = typeof data === 'object' ? (data.text || data.message || JSON.stringify(data)) : data;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}