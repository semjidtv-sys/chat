// 1. Socket.io холболт үүсгэх
// Хаалтан дотор ямар ч хаяг бичихгүй хоосон орхиход Render дээрх домэйнийг автоматаар таньдаг
const socket = io();

// DOM элементүүд авна (та өөрийн HTML дээрх ID-тай тохируулаарай)
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messages');

// 2. Сервертэй холбогдсон эсэхийг шалгах
socket.on('connect', () => {
    console.log('Сервертэй амжилттай холбогдлоо. Socket ID:', socket.id);
});

// 3. Серверээс ирж буй мессежийг хүлээн авах
socket.on('chat message', (data) => {
    displayMessage(data);
});

// 4. Мессеж илгээх функц
function sendMessage() {
    const text = messageInput.value.trim();
    if (text !== '') {
        // Сервер рүү мессеж "chat message" эвентээр илгээнэ
        socket.emit('chat message', {
            text: text,
            timestamp: new Date()
        });
        messageInput.value = ''; // Input цэвэрлэх
    }
}

// 5. Мессежийг дэлгэц дээр харуулах функц
function displayMessage(data) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    // Дата хэлбэрээс хамаарч текст харуулах
    if (typeof data === 'object') {
        messageElement.textContent = data.text || data.message;
    } else {
        messageElement.textContent = data;
    }

    messagesContainer.appendChild(messageElement);
    // Доошоо автоматаар скроллдох
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 6. Илгээх товчлуур дээр дарах үед
if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
}

// 7. Enter товчлуур дарах үед илгээх
if (messageInput) {
    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
}

// 8. Серверээс холболт тасрах үед
socket.on('disconnect', () => {
    console.log('Серверээс холболт тасарлаа.');
});