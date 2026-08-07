// 1. Socket.io холболт үүсгэх
const socket = io();

// Socket эвентүүдийг DOM ачаалагдахыг хүлээлгүй шууд сонсоно
socket.on('connect', () => {
    console.log('Сервертэй амжилттай холбогдлоо. Socket ID:', socket.id);
    updateStatusUI(true);
});

socket.on('disconnect', () => {
    console.log('Серверээс холболт саллаа.');
    updateStatusUI(false);
});

// Серверээс ирэх мессежийг сонсох
socket.on('chat message', (data) => displayMessage(data));
socket.on('message', (data) => displayMessage(data));

// Төлөв засах туслах функц
function updateStatusUI(isConnected) {
    const statusElements = document.querySelectorAll('h3, p, div, span');
    statusElements.forEach(el => {
        if (el.textContent.includes('Оффлайн') || el.textContent.includes('Хүлээгдэж байна...')) {
            if (isConnected) {
                el.textContent = el.textContent.replace('Оффлайн', 'Онлайн').replace('Хүлээгдэж байна...', 'Холбогдсон');
            }
        }
    });
}

// 2. HTML бүрэн уншигдсаны дараах DOM үйлдлүүд
document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('loginOverlay');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');
    const messageInput = document.getElementById('messageInput') || document.querySelector('input[type="text"]');
    const sendBtn = document.getElementById('sendBtn') || document.querySelector('button[type="submit"]') || document.querySelector('.input-container button');

    // Хэрэв аль хэдийн холбогдчихсон бол UI-г шууд шинэчлэх
    if (socket.connected) {
        updateStatusUI(true);
    }

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

// Мессеж дэлгэцэнд харуулах
function displayMessage(data) {
    const messagesContainer = document.getElementById('messages') || document.querySelector('.messages') || document.querySelector('.messages-container');
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.textContent = typeof data === 'object' ? (data.text || data.message || JSON.stringify(data)) : data;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}