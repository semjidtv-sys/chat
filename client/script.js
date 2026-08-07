// 1. Socket.io холболт үүсгэх
const socket = io();

// Socket холболтын эвентүүд
socket.on('connect', () => {
    console.log('Сервертэй амжилттай холбогдлоо. Socket ID:', socket.id);
    updateStatus(true);
});

socket.on('disconnect', () => {
    console.log('Серверээс холболт саллаа.');
    updateStatus(false);
});

socket.on('chat message', (data) => displayMessage(data));
socket.on('message', (data) => displayMessage(data));

// Төлвийг аюулгүй шинэчлэх (HTML бүтцийг эвдэхгүй)
function updateStatus(isConnected) {
    const statusElement = document.getElementById('statusText') || document.querySelector('.status');
    if (statusElement) {
        statusElement.textContent = isConnected ? 'Онлайн' : 'Оффлайн';
    }
}

// 2. DOM уншигдаж дууссаны дараа
document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('loginOverlay');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    // Нэвтрэх функц
    function startChat() {
        const password = passwordInput ? passwordInput.value.trim() : '';
        if (password !== "") {
            if (loginOverlay) loginOverlay.style.display = 'none';
            if (errorMsg) errorMsg.textContent = '';
        } else {
            if (errorMsg) errorMsg.textContent = 'Нууц үгээ оруулна уу!';
        }
    }

    if (loginBtn) loginBtn.addEventListener('click', startChat);
    window.startChat = startChat;

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

    // Enter товч дарах үед
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

// Мессеж дэлгэц дээр харуулах
function displayMessage(data) {
    const messagesContainer = document.getElementById('messages') || document.querySelector('.messages-container');
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.textContent = typeof data === 'object' ? (data.text || data.message || JSON.stringify(data)) : data;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}