const socket = io();
const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "login.html";
} else {
    document.getElementById("currentUserDisplay").innerText = `Нэвтэрсэн: ${username}`;
}

socket.emit("login", username);

const users = document.getElementById("users");

socket.on("users", (list) => {
    users.innerHTML = "";
    const otherUsers = list.filter(user => user !== username);
    
    if (otherUsers.length === 0) {
        users.innerHTML = `<option value="">Онлайн хэрэглэгч байхгүй</option>`;
    } else {
        otherUsers.forEach(user => {
            users.innerHTML += `<option value="${user}">${user}</option>`;
        });
    }
});

function sendMessage() {
    const messageInput = document.getElementById("message");
    const message = messageInput.value.trim();
    const targetUser = users.value;

    if (message === "") return;
    if (!targetUser) {
        alert("Чаталж буй хэрэглэгчээ сонгоно уу!");
        return;
    }

    socket.emit("private message", {
        from: username,
        to: targetUser,
        message: message
    });

    document.getElementById("messages").innerHTML += `
        <div class="msg my-msg">
            <b>Та:</b> ${message}
        </div>
    `;
    
    messageInput.value = "";
    autoScroll();
}

function handleKeyPress(e) {
    if (e.key === "Enter") {
        sendMessage();
    }
}

socket.on("private message", (data) => {
    document.getElementById("messages").innerHTML += `
        <div class="msg other-msg">
            <b>${data.from}:</b> ${data.message}
        </div>
    `;
    autoScroll();
});

function autoScroll() {
    const messages = document.getElementById("messages");
    messages.scrollTop = messages.scrollHeight;
}