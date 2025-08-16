const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-btn");
const modelSelect = document.getElementById("model-select");
const currentModelSpan = document.getElementById("current-model");
const typingIndicator = document.getElementById("typing-indicator");
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

// Model display names
const modelNames = {
    "llama-3.3-70b-versatile": "Llama 3.3 70B",
    "llama-3.1-8b-instant": "Llama 3.1 8B",
    "gemma2-9b-it": "Gemma2 9B",
    "deepseek-r1-distill-llama-70b": "DeepSeek R1",
    "qwen/qwen3-32b": "Qwen3 32B",
    "moonshotai/kimi-k2-instruct": "Kimi K2"
};

// Initialize
let messageCount = 0;
let currentTheme = localStorage.getItem('theme') || 'light';

// Event Listeners
sendBtn.addEventListener("click", sendMessage);
clearBtn.addEventListener("click", clearChat);
chatInput.addEventListener("keypress", handleKeyPress);
modelSelect.addEventListener("change", updateModelIndicator);
themeToggle.addEventListener("click", toggleTheme);
chatInput.addEventListener("input", autoResizeInput);

// Initialize theme
initializeTheme();
updateModelIndicator();
window.addEventListener('load', () => chatInput.focus());

// Functions

function initializeTheme() {
    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(currentTheme + '-theme');
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(currentTheme + '-theme');
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
    body.style.transition = 'all 0.3s ease';
    setTimeout(() => body.style.transition = '', 300);
}

function updateThemeIcon() {
    const icon = themeToggle.querySelector('i');
    if (currentTheme === 'light') {
        icon.className = 'fas fa-moon';
        themeToggle.title = 'Switch to dark mode';
    } else {
        icon.className = 'fas fa-sun';
        themeToggle.title = 'Switch to light mode';
    }
}

function autoResizeInput() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
}

function handleKeyPress(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function updateModelIndicator() {
    const selectedModel = modelSelect.value;
    const displayName = modelNames[selectedModel] || selectedModel;
    currentModelSpan.textContent = displayName;
    currentModelSpan.style.transform = "scale(1.1)";
    setTimeout(() => currentModelSpan.style.transform = "scale(1)", 200);
}

function clearChat() {
    if (messageCount > 0 && !confirm("Are you sure you want to clear the chat?")) return;

    chatBox.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-content">
                <i class="fas fa-sparkles"></i>
                <h2>Welcome to AI Chat!</h2>
                <p>I'm your intelligent assistant powered by advanced AI models. Ask me anything!</p>
            </div>
        </div>
    `;
    messageCount = 0;
    chatInput.focus();
}

function appendMessage(text, sender, modelUsed = null) {
    if (sender === "user" && messageCount === 0) {
        const welcomeMsg = chatBox.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.style.animation = "fadeOut 0.3s ease-out";
            setTimeout(() => welcomeMsg.remove(), 300);
        }
    }

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender);

    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");
    messageContent.textContent = text;

    const messageInfo = document.createElement("div");
    messageInfo.classList.add("message-info");

    if (sender === "user") {
        messageInfo.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } else if (sender === "ai") {
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const model = modelUsed || modelNames[modelSelect.value] || "AI";
        messageInfo.textContent = `${model} • ${time}`;
    }

    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageInfo);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });

    messageCount++;
}

function showTypingIndicator() { typingIndicator.style.display = "block"; }
function hideTypingIndicator() { typingIndicator.style.display = "none"; }
function disableInput() { sendBtn.disabled = true; chatInput.disabled = true; sendBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>'; sendBtn.classList.add("loading"); }
function enableInput() { sendBtn.disabled = false; chatInput.disabled = false; sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'; sendBtn.classList.remove("loading"); chatInput.focus(); }

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) { chatInput.style.animation = "shake 0.5s ease-in-out"; setTimeout(() => chatInput.style.animation = "", 500); return; }
    appendMessage(message, "user");
    chatInput.value = "";
    disableInput(); showTypingIndicator();

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ message: message, model: modelSelect.value })
        });
        hideTypingIndicator();
        if (response.ok) {
            const data = await response.json();
            appendMessage(data.reply, "ai", data.model_used);
        } else {
            const errorText = await response.text();
            appendMessage(`Error ${response.status}: ${errorText}`, "ai");
        }
    } catch (err) {
        hideTypingIndicator();
        appendMessage("❌ Connection error. Please check your internet and try again.", "ai");
        console.error("Error:", err);
        setTimeout(() => {
            if (confirm("Connection failed. Retry?")) { chatInput.value = message; sendMessage(); }
        }, 1000);
    } finally {
        enableInput();
    }
}

// Shake animation CSS
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
    0%,100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}
`;
document.head.appendChild(style);

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); clearChat(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    if (e.key === 'Escape') { chatInput.focus(); chatInput.select(); }
});

// Online/offline status
window.addEventListener('online', () => showStatus('🟢 Back online!', '#4facfe', 3000));
window.addEventListener('offline', () => showStatus('🔴 Connection lost', '#dc3545', 5000));

function showStatus(text, bgColor, duration) {
    const status = document.createElement('div');
    status.innerHTML = text;
    status.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: ${bgColor}; color: white;
        padding: 10px 20px; border-radius: 10px;
        font-size: 14px; z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(status);
    setTimeout(() => status.remove(), duration);
}
