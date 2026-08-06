function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (username === "") {
        alert("Нэрээ оруулна уу!");
        return;
    }
    
    if (password === "") {
        alert("Нууц үгээ оруулна уу!");
        return;
    }

    localStorage.setItem("username", username);
    window.location.href = "chat.html";
}