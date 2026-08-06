const socket = io();
const currentUser = localStorage.getItem("username") || "Зочин";

// --- 1. Цагаас хамаарч мэндчилгээ харуулах логик ---
function updateGreeting() {
  const greetingElement = document.getElementById("chat-greeting");
  if (!greetingElement) return;

  const hour = new Date().getHours();
  let greetingText = "";

  if (hour >= 5 && hour < 12) {
    greetingText = "☀️ Өглөөний мэнд!";
  } else if (hour >= 12 && hour < 18) {
    greetingText = "☀️ Өдрийн мэнд!";
  } else if (hour >= 18 && hour < 23) {
    greetingText = "🌙 Оройн мэнд!";
  } else {
    greetingText = "🌌 Үдшийн мэнд!";
  }

  greetingElement.innerText = greetingText;
}

// Эхлэхэд болон минут тутамд мэндчилгээг шинэчилнэ
updateGreeting();
setInterval(updateGreeting, 60000);

// --- 2. Мессежийг дэлгэцэнд хэвлэх функц ---
function appendMessage(msg) {
  const messagesContainer = document.getElementById("messages");
  const isSent = msg.sender === currentUser;

  const msgDiv = document.createElement("div");
  msgDiv.className = `message-item ${isSent ? "sent" : "received"}`;
  msgDiv.setAttribute("id", `msg-${msg._id}`);

  let html = "";
  if (!isSent && msg.sender) {
    html += `<span class="message-sender">${msg.sender}</span>`;
  }

  html += `<div class="message-bubble">`;
  if (msg.message) {
    html += `<div class="msg-text">${msg.message} ${msg.isEdited ? '<small class="edited-tag">(зассан)</small>' : ''}</div>`;
  }
  if (msg.image) {
    html += `<img src="${msg.image}" alt="зураг" />`;
  }

  // Реакшн товчлуурууд болон цугларсан реакшн харуулах
  html += `
    <div class="reactions-display" id="reactions-${msg._id}">
      ${renderReactions(msg.reactions)}
    </div>
    <div class="message-actions">
      <button onclick="sendReaction('${msg._id}', '❤️')">❤️</button>
      <button onclick="sendReaction('${msg._id}', '👍')">👍</button>
      <button onclick="sendReaction('${msg._id}', '😂')">😂</button>
      ${isSent ? `
        <button onclick="editMsg('${msg._id}', '${msg.message || ''}')">✏️</button>
        <button onclick="deleteMsg('${msg._id}')">🗑️</button>
      ` : ''}
    </div>
  `;

  html += `</div>`;
  msgDiv.innerHTML = html;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Реакшны жагсаалтыг текстийн доор харуулах функц
function renderReactions(reactions) {
  if (!reactions || Object.keys(reactions).length === 0) return "";
  const counts = {};
  Object.values(reactions).forEach(r => counts[r] = (counts[r] || 0) + 1);
  return Object.entries(counts).map(([r, count]) => `<span class="reaction-tag">${r} ${count}</span>`).join(" ");
}

// --- 3. Ивээнүүдийн ажиллах функцүүд ---
function sendReaction(messageId, reaction) {
  socket.emit("add_reaction", { messageId, reaction, username: currentUser });
}

function deleteMsg(messageId) {
  if (confirm("Энэ мессежийг устгах уу?")) {
    socket.emit("delete_message", messageId);
  }
}

function editMsg(messageId, oldText) {
  const newText = prompt("Мессежээ засна уу:", oldText);
  if (newText && newText.trim() !== "" && newText !== oldText) {
    socket.emit("edit_message", { messageId, newMessage: newText.trim() });
  }
}

// --- 4. Socket сүлжээнээс ирэх ивэнтүүд ---
socket.on("receive_message", (msg) => appendMessage(msg));

socket.on("previous_messages", (messages) => {
  const messagesContainer = document.getElementById("messages");
  messagesContainer.innerHTML = "";
  messages.forEach((msg) => appendMessage(msg));
});

socket.on("message_deleted", (messageId) => {
  const elem = document.getElementById(`msg-${messageId}`);
  if (elem) elem.remove();
});

socket.on("message_edited", (msg) => {
  const elem = document.querySelector(`#msg-${msg._id} .msg-text`);
  if (elem) {
    elem.innerHTML = `${msg.message} <small class="edited-tag">(зассан)</small>`;
  }
});

socket.on("update_message_reaction", ({ messageId, reactions }) => {
  const elem = document.getElementById(`reactions-${messageId}`);
  if (elem) elem.innerHTML = renderReactions(reactions);
});