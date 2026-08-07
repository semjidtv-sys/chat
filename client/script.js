// 1. Socket.io холболт үүсгэх (Render домэйнийг автоматаар танина)
const socket = io();

// 2. DOM Элементүүдийг авах
const loginOverlay = document.getElementById('loginOverlay');
const passwordInput = document.getElementById('passwordInput');
const errorMsg = document.getElementById('errorMsg');
const messageInput = document.getElementById('messageInput');
const messagesContainer = document.getElementById('messages');

// 3. Нэвтрэх функц (HTML дээрх onclick="startChat()" энэ функцийг дуудна)
function startChat() {
    const password = passwordInput ? passwordInput.value.trim() : '';

    // Нууц үг оруулсан тохиолдолд нэвтрүүлнэ
    if (password !== "") {
        if (loginOverlay) {
            loginOverlay.style.display = 'none'; // Нэвтрэх цонхыг нууна
        }
        if (errorMsg) {
            errorMsg.textContent = '';
        }
    } else {
        if (errorMsg) {
            errorMsg.textContent = 'Нууц үгээ оруулна уу!';
        }
    }
}

// 4. Socket холболт амжилттай болсон үед
socket.on('connect', () => {
    console.log('Сервертэй амжилттай холбогдлоо. Socket ID:', socket.id);
});

// 5. Серверээс ирж буй мессежийг хүлээн авах
socket.on('chat message', (data) => {
    displayMessage(data);
});

socket.on('message', (data) => {
    displayMessage(data);
});

// 6. Мессеж илгээх функц
function sendMessage() {
    if (!messageInput) return;
    
    const text = messageInput.value.trim();
    if (text !== '') {
        const messageData = {
            text: text,
            timestamp: new Date()
        };
        
        // Сервер рүү мессеж илгээх
        socket.emit('chat message', messageData);
        
        messageInput.value = ''; // Input цэвэрлэх
    }
}

// 7. Мессежийг дэлгэц дээр харуулах функц
function displayMessage(data) {
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if (typeof data === 'object') {
        messageElement.textContent = data.text || data.message || JSON.stringify(data);
    } else {
        messageElement.textContent = data;
    }

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Автомат скролл
}

// 8. Enter товч дарахад нэвтрэх эсвэл мессеж илгээх
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        if (loginOverlay && loginOverlay.style.display !== 'none') {
            startChat();
        } else {
            sendMessage();
        }
    }
});