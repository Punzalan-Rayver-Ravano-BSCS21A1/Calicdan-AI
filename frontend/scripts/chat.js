// scripts/chat.js

// ---- State ----
let messages = [];
let isTyping = false;

// Path to your AI logo/avatar
const AI_AVATAR = "public/CalicdanLogo.png";

// ---- Import marked for markdown parsing ----
// Add this to your HTML: <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

// ---- Settings helpers ----
function getAppSettings() {
  try {
    const sessionRaw = localStorage.getItem("calicdan-session");
    let userId = null;
    try { userId = sessionRaw ? JSON.parse(sessionRaw).user_id : null; } catch (e) {}
    const perUserKey = userId ? ("calicdan-settings_user_" + userId) : null;
    const raw = (perUserKey && localStorage.getItem(perUserKey)) || localStorage.getItem("calicdan-settings") || "{}";
    return JSON.parse(raw);
  } catch { return {}; }
}
function getShowTimestamps() {
  const cfg = getAppSettings();
  return typeof cfg?.chat?.showTimestamps === "boolean" ? cfg.chat.showTimestamps : true;
}

// ✅ Get session info
function getSession() {
  if (window.AuthModule) {
    return window.AuthModule.getSession();
  }
  try {
    const sessionData = localStorage.getItem("calicdan-session");
    return sessionData ? JSON.parse(sessionData) : null;
  } catch {
    return null;
  }
}

// ✅ Get user-specific storage key
function getChatStorageKey() {
  const session = getSession();
  if (session && session.user_id) {
    return `chatHistory_user_${session.user_id}`;
  }
  return "chatHistory"; // Fallback (shouldn't happen if auth is required)
}

function getChatThreadsKey() {
  const session = getSession();
  if (session && session.user_id) {
    return `chatThreads_user_${session.user_id}`;
  }
  return "chatThreads";
}

// ---- Load chat history (user-specific) ----
function loadHistory() {
  try {
    const storageKey = getChatStorageKey();
    const raw = localStorage.getItem(storageKey);
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
  const storageKey = getChatStorageKey();
  localStorage.setItem(storageKey, JSON.stringify(messages));
}

function archiveCurrentConversation() {
  try {
    // Only archive if there is actual conversation beyond the initial assistant message
    const hasUserMessage = Array.isArray(messages) && messages.some(m => m && m.sender === "user");
    if (!hasUserMessage) return;

    const threadsKey = getChatThreadsKey();
    const raw = localStorage.getItem(threadsKey);
    const threads = raw ? JSON.parse(raw) : [];
    threads.push({
      id: Date.now().toString(),
      messages: messages,
      endedAt: new Date().toISOString(),
    });
    localStorage.setItem(threadsKey, JSON.stringify(threads));
  } catch {}
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
  console.log("chat.js initialized @", new Date().toISOString());

  // ✅ Require authentication - redirect to login page with modal open
  const session = getSession();
  if (!session || !session.session_token) {
    window.location.href = "index.html?login=true";
    return;
  }

  loadHistory();

  const messageInput   = document.getElementById("messageInput");
  const sendButton     = document.getElementById("sendButton");
  const attachButton   = document.getElementById("attachButton");
  const fileAttachment = document.getElementById("fileAttachment");
  const actionCards    = document.querySelectorAll(".action-card");
  const clearButton    = document.getElementById("clearChat");
  const newChatButton  = document.getElementById("newChat");

  if (!messageInput || !sendButton) return;

  sendButton.onclick = handleSendMessage;
  if (attachButton && fileAttachment) {
    attachButton.onclick = () => fileAttachment.click();
    fileAttachment.onchange = onAttachmentSelected;
  }
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

  renderMessages(true);
  sendButton.disabled = true;
}

async function onAttachmentSelected(e) {
  const input = e.target;
  const file = input && input.files && input.files[0];
  if (!file) return;
  if (!file.type || !file.type.startsWith('image/')) {
    alert('Only image attachments are supported for now.');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const attachmentMessage = {
      id: Date.now().toString(),
      content: "", // content optional when attachment present
      sender: "user",
      timestamp: new Date().toISOString(),
      attachmentUrl: dataUrl,
      attachmentName: file.name
    };
    messages.push(attachmentMessage);
    saveMessages();
    renderMessages(true);
    input.value = '';
  };
  reader.readAsDataURL(file);
}

// ---- Actions ----
function newChat() {
  archiveCurrentConversation();
  messages = [{
    id: "1",
    content: "👋 I'm Calicdan, Your Messiah Assistant! How can I assist you?",
    sender: "assistant",
    timestamp: new Date().toISOString(),
  }];
  saveMessages();
  renderMessages(true);
}

function clearChat() {
  // ✅ Archive current conversation before clearing
  archiveCurrentConversation();
  // ✅ Clear user-specific chat history
  const storageKey = getChatStorageKey();
  localStorage.removeItem(storageKey);
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

  // ✅ Get session token
  const session = getSession();
  if (!session || !session.session_token) {
    alert("Session expired. Please login again.");
    window.location.href = "index.html?login=true";
    return;
  }

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

  renderMessages();
  showTypingIndicator();

  try {
    // ✅ Send session token with request
    const response = await fetch(`${window.AuthModule.BACKEND_URL}/chat`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        message: inputValue,
        session_token: session.session_token  // ✅ Include session token
      }),
    });

    const data = await response.json();
    hideTypingIndicator();

    if (!response.ok) {
      // ✅ Handle session expiration
      if (response.status === 401) {
        if (window.AuthModule) {
          window.AuthModule.clearSession();
        }
        throw new Error("Session expired. Please login again.");
      }
      throw new Error(data.detail || "Unknown backend error");
    }

    const aiMessage = {
      id: (Date.now() + 1).toString(),
      content: data.reply || "⚠️ No reply from AI.",
      sender: "assistant",
      timestamp: new Date().toISOString(),
    };
    messages.push(aiMessage);
    saveMessages();
    renderMessages();
  } catch (error) {
    hideTypingIndicator();
    
    // ✅ Check if session expired
    if (error.message.includes("Session expired") || error.message.includes("Authentication required")) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: `⚠️ ${error.message} Redirecting to login...`,
        sender: "assistant",
        timestamp: new Date().toISOString(),
      };
      messages.push(errorMessage);
      saveMessages();
      renderMessages();
      
      setTimeout(() => {
        if (window.AuthModule) {
          window.AuthModule.clearSession();
        }
        window.location.href = "index.html?login=true";
      }, 2000);
    } else {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: `⚠️ ${error.message}`,
        sender: "assistant",
        timestamp: new Date().toISOString(),
      };
      messages.push(errorMessage);
      saveMessages();
      renderMessages();
    }
    
    console.error("Chat error:", error);
  }
}

// ---- Render with Markdown support ----
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

    // Parse markdown for assistant messages, escape HTML for user messages
    let contentHtml = isUser 
      ? `<p>${escapeHtml(m.content)}</p>`
      : parseMarkdown(m.content);
    if (m.attachmentUrl) {
      contentHtml += `<div class="attachment"><img src="${m.attachmentUrl}" alt="${escapeHtml(m.attachmentName || 'attachment')}" style="max-width: 240px; border-radius: 8px; margin-top: 8px;"/></div>`;
    }

    return `
      <div class="message ${isUser ? "user-message" : "assistant-message"}">
        ${avatarHtml}
        <div class="message-bubble">
          <div class="message-content">${contentHtml}</div>
          ${tsHtml}
        </div>
      </div>
    `;
  }).join("");

  if (typeof lucide !== "undefined" && lucide.createIcons) {
    try { lucide.createIcons(); } catch {}
  }

  scrollToBottom(scrollHard);
}

// ---- Markdown parser ----
function parseMarkdown(text) {
  if (typeof marked !== 'undefined') {
    return marked.parse(text);
  }
  
  // Fallback simple markdown parser
  let html = escapeHtml(text);
  
  // Bold **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Code `code`
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Lists
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  return html;
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

// ---- Robust scroll ----
function scrollToBottom(force = false) {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  container.scrollTop = container.scrollHeight;

  const scrollFn = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: force ? "auto" : "smooth" });

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
