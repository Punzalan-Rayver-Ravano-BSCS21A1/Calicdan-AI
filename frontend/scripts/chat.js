let messages = JSON.parse(localStorage.getItem("chatHistory")) || [
    {
        id: '1',
        content: "Hi! I'm your AI assistant. How can I help you today?",
        sender: 'assistant',
        timestamp: new Date()
    }
];

let isTyping = false;

// Path to your AI logo/avatar
const AI_AVATAR = "public/CalicdanLogo.png"; // <-- make sure this file exists

// Backend URL
const BACKEND_URL = `http://127.0.0.1:8000/chat`;

document.addEventListener('DOMContentLoaded', initializeChat);

function initializeChat() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const actionCards = document.querySelectorAll('.action-card');
    const clearButton = document.getElementById("clearChat");
    const newChatButton = document.getElementById("newChat"); // ✅ New Chat button hook

    sendButton.addEventListener('click', handleSendMessage);

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    messageInput.addEventListener('input', function () {
        sendButton.disabled = !this.value.trim();
    });

    actionCards.forEach(card => {
        card.addEventListener('click', () => {
            const action = card.dataset.action;
            if (action) {
                messageInput.value = action;
                messageInput.focus();
                sendButton.disabled = false;
            }
        });
    });

    if (clearButton) {
        clearButton.addEventListener("click", clearChat); // ✅ now uses clean function
    }

    if (newChatButton) {
        newChatButton.addEventListener("click", newChat); // ✅ attach new chat
    }

    renderMessages();
    sendButton.disabled = true;
}

// ✅ Function to start a NEW chat session
function newChat() {
    messages = [
        {
            id: '1',
            content: "👋 New chat started! How can I assist you?",
            sender: 'assistant',
            timestamp: new Date()
        }
    ];
    saveMessages();
    renderMessages();
}

// ✅ Function to clear chat
function clearChat() {
    localStorage.removeItem("chatHistory");
    messages = [
        {
            id: '1',
            content: "Chat cleared! Start fresh.",
            sender: 'assistant',
            timestamp: new Date()
        }
    ];
    saveMessages();
    renderMessages();
}

async function handleSendMessage() {
    const messageInput = document.getElementById('messageInput');
    const inputValue = messageInput.value.trim();
    if (!inputValue) return;

    const userMessage = {
        id: Date.now().toString(),
        content: inputValue,
        sender: 'user',
        timestamp: new Date()
    };
    messages.push(userMessage);
    saveMessages();
    messageInput.value = '';
    document.getElementById('sendButton').disabled = true;

    renderMessages();
    showTypingIndicator();

    try {
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: inputValue })
        });

        const data = await response.json();
        hideTypingIndicator();

        if (!response.ok) {
            throw new Error(data.detail || "Unknown backend error");
        }

        const aiMessage = {
            id: (Date.now() + 1).toString(),
            content: data.reply || "⚠️ No reply from AI.",
            sender: 'assistant',
            timestamp: new Date()
        };

        messages.push(aiMessage);
        saveMessages();
        renderMessages();

    } catch (error) {
        hideTypingIndicator();
        const errorMessage = {
            id: (Date.now() + 1).toString(),
            content: `⚠️ ${error.message}`,
            sender: 'assistant',
            timestamp: new Date()
        };
        messages.push(errorMessage);
        saveMessages();
        renderMessages();
        console.error("Chat error:", error);
    }
}

function renderMessages() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = messages.map(message => {
        const isUser = message.sender === 'user';

        const avatarHtml = isUser
            ? `<div class="message-avatar">U</div>`
            : `<div class="message-avatar"><img src="${AI_AVATAR}" alt="Calicdan AI" /></div>`;

        return `
            <div class="message ${isUser ? 'user-message' : 'assistant-message'}">
                ${avatarHtml}
                <div class="message-content"><p>${escapeHtml(message.content)}</p></div>
            </div>
        `;
    }).join('');
    scrollToBottom();
}

function saveMessages() {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
}

function showTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.classList.remove('hidden');
    isTyping = true;
    scrollToBottom();
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.classList.add('hidden');
    isTyping = false;
}

function scrollToBottom() {
    setTimeout(() => {
        const chatMessages = document.getElementById('chatMessages');
        const typingIndicator = document.getElementById('typingIndicator');
        const target = isTyping ? typingIndicator : chatMessages;
        target.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}
