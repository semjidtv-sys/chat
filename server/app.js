<!DOCTYPE html>
<html lang="mn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Тусгай Чат</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <!-- 1. Нэвтрэх цонх (Зураг дээрхтэй яг ижил дизайнтай) -->
    <div id="loginOverlay" class="login-overlay">
        <div class="login-box">
            <div class="avatar-circle">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
            </div>
            
            <p class="quote-text">Гайхамшиг зөвхөн өөрт нь итгэдэг хүмүүстэй учирдаг Аз жаргал зөвхөн өөрийн хүлээж байгаа газар очдог</p>
            <p class="sub-text">Та аль тал болохоо сонгоод нууц үгээ оруулна уу</p>
            
            <div class="role-selector">
                <label class="role-label">
                    <input type="radio" name="userRole" value="m" checked> М хэрэглэгч
                </label>
                <label class="role-label">
                    <input type="radio" name="userRole" value="o"> О хэрэглэгч
                </label>
            </div>

            <input type="password" id="passwordInput" class="login-input" placeholder="Нууц үг оруулна уу...">
            <button id="loginBtn" class="login-btn">Нэвтрэх</button>
            <div id="errorMsg" class="error-msg"></div>
        </div>
    </div>

    <!-- 2. Чатын Үндсэн Дэлгэц -->
    <div class="chat-app">
        <div class="chat-header">
            <div>
                <h3 id="chatTitle">М & О Талын Чат</h3>
                <span id="statusBadge" class="status-badge">Холбогдож байна...</span>
            </div>
            <div id="typingIndicator" class="typing-indicator" style="display: none;">Нөгөө тал бичиж байна...</div>
        </div>
        
        <div id="messages" class="messages-container"></div>

        <!-- Reply харагдах хэсэг -->
        <div id="replyPreview" class="reply-preview" style="display: none;">
            <div class="reply-content">
                <span id="replyUser" class="reply-user"></span>
                <p id="replyText" class="reply-text"></p>
            </div>
            <button id="cancelReplyBtn" class="cancel-reply">✕</button>
        </div>

        <div class="input-container">
            <label for="imageInput" class="image-upload-btn" title="Зураг илгээх">📷</label>
            <input type="file" id="imageInput" accept="image/*" style="display: none;">
            
            <input type="text" id="messageInput" class="chat-input" placeholder="Мессеж бичих..." autocomplete="off">
            <button id="sendBtn" class="send-btn">Илгээх</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script src="script.js"></script>
</body>
</html>