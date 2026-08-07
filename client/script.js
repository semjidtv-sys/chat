// 1. Socket.io холболт үүсгэх
const socket = io();

// HTML бүрэн уншигдаж дууссаны дараа кодоо ажиллуулна
document.addEventListener('DOMContentLoaded', () => {
    // DOM Элементүүд
    const loginOverlay = document.getElementById('loginOverlay');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendBtn') || document.getElementById('sendButton');
    const messagesContainer = document.getElementById('messages');

    // 2. Нэвтрэх функц
    function startChat() {
        const password = passwordInput ? passwordInput.value.trim() : '';

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

    // Нэвтрэх товчлуур дээр дарах үед startChat функцийг дуудна
    if (loginBtn) {
        loginBtn.addEventListener('click', startChat);
    }

    // Глобал функц болгож зарлах (Хэрэв HTML-ээс onclick дуудвал)
    window.startChat = startChat;

    // 3. Socket холболт амжилттай болсон үед
    socket.on('connect', () => {
        console.log('Сервертэй амжилттай холбогдлоо. Socket ID:', socket.id);
    });

    // 4. Серверээс ирж буй мессежийг хүлээн авах
    socket.on('chat message', (data) => {
        displayMessage(data);
    });

    socket.on('message', (data) => {
        displayMessage(data);
    });

    // 5. Мессеж илгээх функц
    function sendMessage() {
        if (!messageInput) return;
        
        const text = messageInput.value.trim();
        if (text !== '') {
            const messageData = {
                text: text,
                timestamp: new Date()
            };
            
            socket.emit('chat message', messageData);
            messageInput.value = '';
        }
    }

    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    // 6. Мессеж дэлгэц дээр харуулах
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
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 7. Enter товч дарахад нэвтрэх эсвэл мессеж илгээх
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (loginOverlay && loginOverlay.style.display !== 'none') {
                startChat();
            } else {
                sendMessage();
            }
        }
    });

    // Дэлгэц дээрх товчлуурууд дуудаж болохоор глобал функц болгож зарлана
    window.sendMessage = sendMessage;

    // 8. Зураг илгээх (одоогийн сервер зургийг base64 хэлбэрээр хүлээж авдаг)
    window.sendImage = function (event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Зөвхөн зураг файл сонгоно уу!');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            socket.emit('chat message', { image: reader.result, timestamp: new Date() });
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    };

    // 9. Нууц үг солих модал цонх нээх/хаах
    // Санамж: сервер талд хэрэглэгчийн нууц үг хадгалах/шалгах логик хараахан
    // хэрэгжээгүй тул энэ функц зөвхөн цонхыг нээж хаана, бодит нууц үг солихгүй.
    window.openPwdModal = function () {
        const modal = document.getElementById('pwdModal');
        if (modal) modal.style.display = 'flex';
    };

    window.closePwdModal = function () {
        const modal = document.getElementById('pwdModal');
        if (modal) modal.style.display = 'none';
    };

    window.submitChangePassword = function () {
        alert('Нууц үг солих боломж серверт хараахан хэрэгжээгүй байна.');
        window.closePwdModal();
    };
});