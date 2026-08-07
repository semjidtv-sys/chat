const socket = io();
const currentUser = localStorage.getItem("username");

// Хэрэглэгчийн нэр байхгүй бол login хуудас руу буцаана
if (!currentUser) {
  window.location.href = "login.html";
}

socket.emit("user_connected", currentUser);

// Ирж буй мессежийн текстийг кэшлэж, засах үед ашиглана (HTML injection-ээс сэргийлнэ)
const rawMessages = new Map();

// --- 0. HTML escape хийх функц (XSS-ээс хамгаална) ---
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  rawMessages.set(msg._id, msg.message || "");

  const msgDiv = document.createElement("div");
  msgDiv.className = `message-item ${isSent ? "sent" : "received"}`;
  msgDiv.setAttribute("id", `msg-${msg._id}`);

  let html = "";
  if (!isSent && msg.sender) {
    html += `<span class="message-sender">${escapeHtml(msg.sender)}</span>`;
  }

  html += `<div class="message-bubble">`;
  if (msg.message) {
    html += `<div class="msg-text">${escapeHtml(msg.message)} ${msg.isEdited ? '<small class="edited-tag">(зассан)</small>' : ''}</div>`;
  }
  if (msg.image) {
    html += `<img src="${escapeHtml(msg.image)}" alt="зураг" />`;
  }

  // Реакшн товчлуурууд болон цугларсан реакшн харуулах
  html += `
    <div class="reactions-display" id="reactions-${msg._id}">
      ${renderReactions(msg.reactions)}
    </div>
    <div class="message-actions">
      <button class="react-btn" data-id="${msg._id}" data-reaction="❤️">❤️</button>
      <button class="react-btn" data-id="${msg._id}" data-reaction="👍">👍</button>
      <button class="react-btn" data-id="${msg._id}" data-reaction="😂">😂</button>
      ${isSent ? `
        <button class="edit-btn" data-id="${msg._id}">✏️</button>
        <button class="delete-btn" data-id="${msg._id}">🗑️</button>
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
  return Object.entries(counts).map(([r, count]) => `<span class="reaction-tag">${escapeHtml(r)} ${count}</span>`).join(" ");
}

// --- 3. Мессеж/зураг илгээх ---
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const imageInput = document.getElementById("imageInput");

function sendTextMessage() {
  if (!messageInput) return;
  const text = messageInput.value.trim();
  if (text === "") return;

  socket.emit("send_message", { sender: currentUser, message: text });
  messageInput.value = "";
}

if (sendBtn) {
  sendBtn.addEventListener("click", sendTextMessage);
}

if (messageInput) {
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendTextMessage();
    }
  });
}

if (imageInput) {
  imageInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Зөвхөн зураг файл сонгоно уу!");
      imageInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("send_message", { sender: currentUser, message: "", image: reader.result });
      imageInput.value = "";
    };
    reader.onerror = () => {
      alert("Зураг уншихад алдаа гарлаа. Дахин оролдоно уу!");
    };
    reader.readAsDataURL(file);
  });
}

// --- 4. Реакшн, засах, устгах товчлуурын үйлдлүүд (event delegation) ---
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
  if (newText && newText.trim() !== "" && newText.trim() !== oldText) {
    socket.emit("edit_message", { messageId, newMessage: newText.trim() });
  }
}

const messagesContainerEl = document.getElementById("messages");
if (messagesContainerEl) {
  messagesContainerEl.addEventListener("click", (e) => {
    const target = e.target.closest("button");
    if (!target) return;

    const id = target.dataset.id;
    if (!id) return;

    if (target.classList.contains("react-btn")) {
      sendReaction(id, target.dataset.reaction);
    } else if (target.classList.contains("delete-btn")) {
      deleteMsg(id);
    } else if (target.classList.contains("edit-btn")) {
      editMsg(id, rawMessages.get(id) || "");
    }
  });
}

// --- 5. Socket сүлжээнээс ирэх ивэнтүүд ---
socket.on("receive_message", (msg) => appendMessage(msg));

socket.on("previous_messages", (messages) => {
  const messagesContainer = document.getElementById("messages");
  messagesContainer.innerHTML = "";
  rawMessages.clear();
  messages.forEach((msg) => appendMessage(msg));
});

socket.on("message_deleted", (messageId) => {
  const elem = document.getElementById(`msg-${messageId}`);
  if (elem) elem.remove();
  rawMessages.delete(messageId);
});

socket.on("message_edited", (msg) => {
  rawMessages.set(msg._id, msg.message || "");
  const elem = document.querySelector(`#msg-${msg._id} .msg-text`);
  if (elem) {
    elem.innerHTML = `${escapeHtml(msg.message)} <small class="edited-tag">(зассан)</small>`;
  }
});

socket.on("update_message_reaction", ({ messageId, reactions }) => {
  const elem = document.getElementById(`reactions-${messageId}`);
  if (elem) elem.innerHTML = renderReactions(reactions);
});