// scripts/chat.js

// ---- State ----
let messages = [];
let isTyping = false;

// Path to your AI logo/avatar
const AI_AVATAR = "public/CalicdanLogo.png";

// Backend URL
const BACKEND_URL = `http://127.0.0.1:8000/chat`;

// ---- Settings helpers ----
function getAppSettings() {
  try { return JSON.parse(localStorage.getItem("calicdan-settings")) || {}; }
  catch { return {}; }
}
function getShowTimestamps() {
  const cfg = getAppSettings();
  return typeof cfg?.chat?.showTimestamps === "boolean" ? cfg.chat.showTimestamps : true;
}

// ---- Load chat history (no-cache bootstrap) ----
function loadHistory() {
  try {
    const raw = localStorage.getItem("chatHistory");
    if (!raw) {
      messages = [{
        id: "1",
        content: "Hi! I'm your AI assistant. How can I help you today?",
        sender: "assistant",
        timestamp: new Date().toISOString(),
      }];
      return;
    }
    const parsed = JSON.parse(raw);
    messages = parsed.map(m => ({
      ...m,
      timestamp: typeof m.timestamp === "string" ? m.timestamp : new Date(m.timestamp).toISOString(),
    }));
  } catch {
    messages = [{
      id: "1",
      content: "Hi! I'm your AI assistant. How can I help you today?",
      sender: "assistant",
      timestamp: new Date().toISOString(),
    }];
  }
}

function saveMessages() {
  localStorage.setItem("chatHistory", JSON.stringify(messages));
}

// ---- Time formatting ----
function formatTime(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", initChatPage);
document.addEventListener("soft:navigated", () => {
  if (document.getElementById("chatMessages")) initChatPage();
});

function initChatPage() {
  // ensure we’re really loading THIS file (cache-bust check)
  console.log("chat.js initialized @", new Date().toISOString());

  loadHistory();

  const messageInput   = document.getElementById("messageInput");
  const sendButton     = document.getElementById("sendButton");
  const actionCards    = document.querySelectorAll(".action-card");
  const clearButton    = document.getElementById("clearChat");
  const newChatButton  = document.getElementById("newChat");

  if (!messageInput || !sendButton) return;

  // Wire events once per init
  sendButton.onclick = handleSendMessage;
  messageInput.onkeypress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); handleSendMessage();
    }
  };
  messageInput.oninput = function () { sendButton.disabled = !this.value.trim(); };

  actionCards.forEach(card => {
    card.onclick = () => {
      const action = card.dataset.action;
      if (action) {
        messageInput.value = action;
        messageInput.focus();
        sendButton.disabled = false;
      }
    };
  });

  if (clearButton) clearButton.onclick = clearChat;
  if (newChatButton) newChatButton.onclick = newChat;

  renderMessages(true);        // initial render
  sendButton.disabled = true;  // until user types
}

// ---- Actions ----
function newChat() {
  messages = [{
    id: "1",
    content: "👋 New chat started! How can I assist you?",
    sender: "assistant",
    timestamp: new Date().toISOString(),
  }];
  saveMessages();
  renderMessages(true);
}

function clearChat() {
  localStorage.removeItem("chatHistory");
  messages = [{
    id: "1",
    content: "Chat cleared! Start fresh.",
    sender: "assistant",
    timestamp: new Date().toISOString(),
  }];
  saveMessages();
  renderMessages(true);
}

async function handleSendMessage() {
  const messageInput = document.getElementById("messageInput");
  const inputValue = messageInput.value.trim();
  if (!inputValue) return;

  const userMessage = {
    id: Date.now().toString(),
    content: inputValue,
    sender: "user",
    timestamp: new Date().toISOString(),
  };
  messages.push(userMessage);
  saveMessages();
  messageInput.value = "";
  document.getElementById("sendButton").disabled = true;

  renderMessages();  // will scroll
  showTypingIndicator();

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: inputValue }),
    });

    const data = await response.json();
    hideTypingIndicator();

    if (!response.ok) throw new Error(data.detail || "Unknown backend error");

    const aiMessage = {
      id: (Date.now() + 1).toString(),
      content: data.reply || "⚠️ No reply from AI.",
      sender: "assistant",
      timestamp: new Date().toISOString(),
    };
    messages.push(aiMessage);
    saveMessages();
    renderMessages(); // will scroll
  } catch (error) {
    hideTypingIndicator();
    const errorMessage = {
      id: (Date.now() + 1).toString(),
      content: `⚠️ ${error.message}`,
      sender: "assistant",
      timestamp: new Date().toISOString(),
    };
    messages.push(errorMessage);
    saveMessages();
    renderMessages(); // will scroll
    console.error("Chat error:", error);
  }
}

// ---- Render ----
function renderMessages(scrollHard = false) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  const showTimestamps = getShowTimestamps();

  chatMessages.innerHTML = messages.map((m) => {
    const isUser = m.sender === "user";
    const avatarHtml = isUser
      ? `<div class="message-avatar">U</div>`
      : `<div class="message-avatar"><img src="${AI_AVATAR}" alt="Calicdan AI" /></div>`;

    const tsHtml = showTimestamps
      ? `<div class="message-meta"><span class="message-timestamp">${formatTime(m.timestamp)}</span></div>`
      : "";

    return `
      <div class="message ${isUser ? "user-message" : "assistant-message"}">
        ${avatarHtml}
        <div class="message-bubble">
          <div class="message-content"><p>${escapeHtml(m.content)}</p></div>
          ${tsHtml}
        </div>
      </div>
    `;
  }).join("");

  // re-run lucide icons if any dynamic ones appear
  if (typeof lucide !== "undefined" && lucide.createIcons) {
    try { lucide.createIcons(); } catch {}
  }

  // robust scroll
  scrollToBottom(scrollHard);
}

// ---- Typing indicator ----
function showTypingIndicator() {
  const el = document.getElementById("typingIndicator");
  if (!el) return;
  el.classList.remove("hidden");
  isTyping = true;
  scrollToBottom();
}
function hideTypingIndicator() {
  const el = document.getElementById("typingIndicator");
  if (!el) return;
  el.classList.add("hidden");
  isTyping = false;
}

// ---- Robust scroll (works for page or container scroll) ----
function scrollToBottom(force = false) {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  // If the messages list itself is scrollable
  container.scrollTop = container.scrollHeight;

  // Also ensure the window scrolls to the bottom
  const scrollFn = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: force ? "auto" : "smooth" });

  // Try a few times to beat fonts/layout async
  scrollFn();
  setTimeout(scrollFn, 50);
  setTimeout(scrollFn, 150);
  requestAnimationFrame(scrollFn);
}

// ---- Utils ----
function escapeHtml(text) {
  const map = { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
