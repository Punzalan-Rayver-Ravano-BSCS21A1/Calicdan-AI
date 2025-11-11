// scripts/chat.js

// ---- State ----
let messages = [];
let isTyping = false;
let currentSessionId = null; 
let chatInitialized = false;

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



// ---- Session helpers ----
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
function getChatStorageKey() {
  const session = getSession();
  if (session && session.user_id) {
    return `chatHistory_user_${session.user_id}`;
  }
  return "chatHistory";
}
function getUserIdForHistory() {
    const session = getSession();
    return session ? session.user_id : null;
}

function getActiveSessionFromStorage() {
    const userId = getUserIdForHistory(); // you already have this function in history.js
    if (!userId) return null;
    const activeKey = 'calicdan-activeSession_user_' + userId;
    const raw = localStorage.getItem(activeKey);
    return raw ? JSON.parse(raw) : null;
}
function getChatThreadsKey() {
  const session = getSession();
  if (session && session.user_id) {
    return `chatThreads_user_${session.user_id}`;
  }
  return "chatThreads";
}

// ---- Load chat history from backend ----
// ---- Load chat history from backend (debug version) ----
async function loadHistory() {
    const activeSession = getActiveSessionFromStorage();
    const session = getSession();

    // If no valid login session, show default assistant message
    if (!session || !session.session_token) {
        messages = [{
            id: Date.now().toString(),
            content: "Hi! I'm your AI assistant. How can I help you today?",
            sender: "assistant",
            timestamp: new Date().toISOString(),
        }];
        currentSessionId = null;
        renderMessages(true);
        return;
    }

    try {
        const response = await fetch(`${window.AuthModule.BACKEND_URL}/chat/sessions`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${session.session_token}` }
        });

        if (!response.ok) throw new Error("Failed to fetch chat sessions");

        let sessions = await response.json();

        // Filter out empty or cleared sessions
        sessions = sessions.filter(s => s.messages && s.messages.length > 0 && !s.cleared);

        if (sessions.length === 0) {
            // No sessions with messages
            currentSessionId = null;
            messages = [{
                id: Date.now().toString(),
                content: "Hi! I'm your AI assistant. How can I help you today?",
                sender: "assistant",
                timestamp: new Date().toISOString(),
            }];
            renderMessages(true);
            return;
        }

        // ✅ Move active session to the top if it exists
        if (activeSession) {
            const index = sessions.findIndex(s => s.id === activeSession.sessionId);
            if (index > -1) {
                const [found] = sessions.splice(index, 1); // remove from current position
                sessions.unshift(found); // insert at the front
            } else {
                // If active session is missing from backend, add it on top
                sessions.unshift({
                    id: activeSession.sessionId,
                    messages: activeSession.messages,
                    endedAt: Date.now()
                });
            }
            messages = activeSession.messages || [];
            currentSessionId = activeSession.sessionId || null;
        } else {
            // No active session, load most recent session
            const lastSession = sessions[0];
            currentSessionId = lastSession.id || null;
            messages = [];
            lastSession.messages.forEach((m, idx) => {
                messages.push({
                    id: (m.timestamp ? new Date(m.timestamp).getTime() : Date.now()) + "_" + idx,
                    sender: (m.sender === "ai") ? "assistant" : "user",
                    content: m.content || "",
                    timestamp: m.timestamp || new Date().toISOString(),
                    attachmentUrl: m.attachmentUrl || null,
                    attachmentName: m.attachmentName || null,
                    archived: true
                });
            });
        }

        // Save sessions to localStorage for history/session cards
        const userId = getUserIdForHistory();
        const threadsKey = 'chatThreads_user_' + userId;
        localStorage.setItem(threadsKey, JSON.stringify(sessions));

        renderMessages(true);

    } catch (err) {
        console.error("Error loading chat history:", err);
        messages = [{
            id: Date.now().toString(),
            content: "⚠️ Could not load chat history. Starting fresh.",
            sender: "assistant",
            timestamp: new Date().toISOString(),
        }];
        currentSessionId = null;
        renderMessages(true);
    }
}

async function clearChatDB() {
  const session = getSession();

  if (!session || !session.session_token || !currentSessionId) {
    console.warn("Cannot clear chat: missing session or currentSessionId.");
    return;
  }

  console.log("Clearing chat session:", currentSessionId);

  try {
    const response = await fetch(
      `${window.AuthModule.BACKEND_URL}/chat/sessions/${currentSessionId}/clear`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.session_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Failed to clear session messages:", response.status, text);
      return;
    }

    console.log("Session messages cleared successfully ✅");

    // ✅ Remove from active session tracking
    const userId = getUserIdForHistory();
    localStorage.removeItem(`calicdan-activeSession_user_${userId}`);

    // ✅ Update sidebar thread list (remove this session)
    const threadKey = `chatThreads_user_${userId}`;
    let threads = JSON.parse(localStorage.getItem(threadKey) || "[]");
    threads = threads.filter(t => t.id !== currentSessionId);
    localStorage.setItem(threadKey, JSON.stringify(threads));

    // ✅ Reset current chat to a clean welcome state
    messages = [{
      id: Date.now().toString(),
      content: "👋 I'm Calicdan, Your Messiah Assistant! How can I assist you?",
      sender: "assistant",
      timestamp: new Date().toISOString(),
      archived: true
    }];

    currentSessionId = null;
    renderMessages(true);

    const messageInput = document.getElementById("messageInput");
    if (messageInput) messageInput.focus();

    const sendButton = document.getElementById("sendButton");
    if (sendButton) sendButton.disabled = true;

  } catch (err) {
    console.error("Could not clear session messages (network or code error):", err);
  }
}

// ---- Archive current conversation (DB-backed) ----
async function archiveCurrentConversation() {
  const session = getSession();
  if (!session || !session.session_token) return false;

  if (!currentSessionId || messages.length === 0) return true;

  try {
    // Only send messages that haven't been archived yet
    // We'll use a `archived` flag on each message
    const newMessages = messages.filter(m => !m.archived);
    if (newMessages.length === 0) return true;

    for (const m of newMessages) {
      const payload = {
        message: m.content,
        sender: (m.sender === "assistant") ? "ai" : "user",  // ✅ FIX: correct identity
        session_token: session.session_token,
        session_id: currentSessionId,
        attachmentUrl: m.attachmentUrl || null,
        attachmentName: m.attachmentName || null
      };

      const resp = await fetch(`${window.AuthModule.BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error("Failed to archive message:", text);
        return false;
      }

      // Mark message as archived so it won't be sent again
      m.archived = true;
    }

    console.log("All new messages archived successfully ✅");
    return true;

  } catch (err) {
    console.error("Error saving conversation to backend:", err);
    return false;
  }
}


// ---- Start a new chat session (DB-backed) ----
async function startNewChat() {
  const session = getSession();
  if (!session || !session.session_token) return;

  localStorage.removeItem(`calicdan-activeSession_user_${getUserIdForHistory()}`);

  // Archive current session first
  if (currentSessionId && messages.length > 0) {
    const success = await archiveCurrentConversation();
    if (!success) {
      messages = [{
        id: Date.now().toString(),
        content: "⚠️ Could not archive previous session. Try again later.",
        sender: "assistant",
        timestamp: new Date().toISOString(),
      }];
      renderMessages(true);
      return;
    }
  }

  try {
    // Create new session in backend
    const resp = await fetch(`${window.AuthModule.BACKEND_URL}/chat/new-session`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${session.session_token}` }
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || "Failed to start new session");

    currentSessionId = data.session_id;

    // Initialize new chat message list
    messages = [{
      id: Date.now().toString(),
      content: "👋 I'm Calicdan, Your Messiah Assistant! How can I assist you?",
      sender: "assistant",
      timestamp: new Date().toISOString(),
      archived: true
    }];

    

    // ✅ Update ACTIVE session storage
    const userId = getUserIdForHistory();
    const activeKey = `calicdan-activeSession_user_${userId}`;
    localStorage.setItem(activeKey, JSON.stringify({
      sessionId: currentSessionId,
      messages: messages
    }));

    // ✅ Update session thread list for sidebar/history UI
    const threadKey = `chatThreads_user_${userId}`;
    let threads = JSON.parse(localStorage.getItem(threadKey) || "[]");
    threads.unshift({
      id: currentSessionId,
      messages: messages,
      endedAt: Date.now()
    });
    localStorage.setItem(threadKey, JSON.stringify(threads));

    // Refresh displayed messages
    renderMessages(true);

    // ✅ Your UI restore logic stays here
    const messageInput = document.getElementById("messageInput");
    if (messageInput) messageInput.focus();

    const sendButton = document.getElementById("sendButton");
    if (sendButton) sendButton.disabled = true;

  } catch (err) {
    console.error("Could not start new chat:", err);

    messages = [{
      id: Date.now().toString(),
      content: "⚠️ Could not start new chat. Please try again.",
      sender: "assistant",
      timestamp: new Date().toISOString(),
    }];

    renderMessages(true);
  }
}


const clearButton = document.getElementById("clearChat");
const newChatButton = document.getElementById("newChat");

if (clearButton) clearButton.addEventListener("click", clearChatDB);
if (newChatButton) newChatButton.addEventListener("click", startNewChat);


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

// ---- Optional: track if chat is active to avoid unnecessary refresh ----
let chatActive = true; // starts active

function onChatTabActivated() {
  if (!chatActive) {
    refreshChat();
    chatActive = true;
  }
}

function onChatTabDeactivated() {
  chatActive = false;
}
// ---- Tab switch listener ----
document.addEventListener("soft:navigated", () => {
  const chatTab = document.getElementById("chatTab"); // your Chat tab container
  if (chatTab && chatTab.classList.contains("active")) {
    onChatTabActivated();   // <-- use the flag function
  } else {
    onChatTabDeactivated(); // <-- mark inactive
  }
});

const chatTabButton = document.getElementById("chatTabButton");
if (chatTabButton) {
  chatTabButton.addEventListener("click", () => {
    onChatTabActivated();  // <-- use the flag function
  });
}

async function initChatPage() {
  if (chatInitialized) return;  // Prevent duplicate initialization
  chatInitialized = true;

  console.log("chat.js initialized @", new Date().toISOString());

  const session = getSession();
  if (!session || !session.session_token) {
    window.location.href = "index.html?login=true";
    return;
  }

  await loadHistory();  // load messages first time

  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const attachButton = document.getElementById("attachButton");
  const fileAttachment = document.getElementById("fileAttachment");
  const actionCards = document.querySelectorAll(".action-card");
  const clearButton = document.getElementById("clearChat");
  const newChatButton = document.getElementById("newChat");

  if (!messageInput || !sendButton) return;

  messageInput.focus();

  // Input change listener
  messageInput.addEventListener("input", () => {
    sendButton.disabled = !messageInput.value.trim();
  });

  // Send button
  sendButton.addEventListener("click", handleSendMessage);

  // Enter key for sending
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.value.trim()) handleSendMessage();
    }
  });

  // Attachments
  if (attachButton && fileAttachment) {
    attachButton.addEventListener("click", () => fileAttachment.click());
    fileAttachment.addEventListener("change", onAttachmentSelected);
  }

  // Action cards
  actionCards.forEach(card => {
    card.addEventListener("click", () => {
      const action = card.dataset.action;
      if (action) {
        messageInput.value = action;
        messageInput.focus();
        sendButton.disabled = true;
      }
    });
  });

  renderMessages(true);
  sendButton.disabled = true;
}

// ---- Attachment handler ----
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
      content: "",
      sender: "user",
      timestamp: new Date().toISOString(),
      attachmentUrl: dataUrl,
      attachmentName: file.name
    };
    messages.push(attachmentMessage);
    renderMessages(true);
    input.value = '';
  };
  reader.readAsDataURL(file);
}


// ---- Send message ----
async function handleSendMessage() {
  const messageInput = document.getElementById("messageInput");
  console.log("Send button clicked. Value:", messageInput.value);
  const inputValue = messageInput.value.trim();
  if (!inputValue) return;

  const session = getSession();
  if (!session || !session.session_token) {
    alert("Session expired. Please login again.");
    window.location.href = "index.html?login=true";
    return;
  }

  // Add user's message locally
  const userMessage = {
    id: Date.now().toString(),
    content: inputValue,
    sender: "user",
    timestamp: new Date().toISOString(),
  };
  messages.push(userMessage);

  messageInput.value = "";
  document.getElementById("sendButton").disabled = true;
  renderMessages();
  showTypingIndicator();

  try {
    const response = await fetch(`${window.AuthModule.BACKEND_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: inputValue,
        session_token: session.session_token,
        session_id: currentSessionId // can be null for new session
      }),
    });

    const data = await response.json();
    hideTypingIndicator();

    if (!response.ok) throw new Error(data.detail || "Unknown backend error");

    currentSessionId = data.session_id || currentSessionId;

    // Add AI reply locally
    const aiMessage = {
      id: (Date.now() + 1).toString(),
      content: data.reply || "⚠️ No reply from AI.",
      sender: "assistant",
      timestamp: new Date().toISOString(),
    };
    messages.push(aiMessage);
    renderMessages();

  } catch (error) {
    hideTypingIndicator();
    const errorMessage = {
      id: (Date.now() + 1).toString(),
      content: `⚠️ ${error.message}`,
      sender: "assistant",
      timestamp: new Date().toISOString(),
    };
    messages.push(errorMessage);
    renderMessages();
    console.error("Chat error:", error);
  }
}

// ---- Render messages ----
function renderMessages(scrollHard = false) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  const showTimestamps = getShowTimestamps();

  chatMessages.innerHTML = messages.map(m => {
    const isUser = m.sender === "user";
    const avatarHtml = isUser
      ? `<div class="message-avatar">U</div>`
      : `<div class="message-avatar"><img src="${AI_AVATAR}" alt="Calicdan AI" /></div>`;
    const tsHtml = showTimestamps
      ? `<div class="message-meta"><span class="message-timestamp">${formatTime(m.timestamp)}</span></div>`
      : "";
    let contentHtml = isUser ? `<p>${escapeHtml(m.content)}</p>` : parseMarkdown(m.content);
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
  if (typeof marked !== 'undefined') return marked.parse(text);
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
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

// ---- Scroll ----
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
