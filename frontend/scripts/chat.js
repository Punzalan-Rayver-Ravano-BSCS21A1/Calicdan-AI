let messages = [
    {
        id: '1',
        content: "Hi! I'm your AI assistant. How can I help you today?",
        sender: 'assistant',
        timestamp: new Date()
    }
];

let isTyping = false;

// Determine backend URL automatically
const BACKEND_URL = `http://127.0.0.1:8000/chat`; // Always point to FastAPI

document.addEventListener('DOMContentLoaded', initializeChat);

function initializeChat() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const actionCards = document.querySelectorAll('.action-card');

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

    renderMessages();
    sendButton.disabled = true;
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
        renderMessages();
        console.error("Chat error:", error);
    }
}

function renderMessages() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = messages.map(message => {
        const isUser = message.sender === 'user';
        const avatarText = isUser ? 'U' : 'AI';
        return `
            <div class="message ${isUser ? 'user-message' : 'assistant-message'}">
                <div class="message-avatar">${avatarText}</div>
                <div class="message-content"><p>${escapeHtml(message.content)}</p></div>
            </div>
        `;
    }).join('');
    scrollToBottom();
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
