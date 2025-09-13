// Chat page functionality

let messages = [
    {
        id: '1',
        content: "Hi! I'm your AI assistant. How can I help you today?",
        sender: 'assistant',
        timestamp: new Date()
    }
];

let isTyping = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeChat();
});

function initializeChat() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    const actionCards = document.querySelectorAll('.action-card');
    
    // Handle send button click
    sendButton.addEventListener('click', handleSendMessage);
    
    // Handle enter key in input
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Handle input changes for send button state
    messageInput.addEventListener('input', function() {
        sendButton.disabled = !this.value.trim();
    });
    
    // Handle quick action cards
    actionCards.forEach(card => {
        card.addEventListener('click', function() {
            const action = this.dataset.action;
            if (action) {
                messageInput.value = action;
                messageInput.focus();
                sendButton.disabled = false;
            }
        });
    });
    
    // Initial render
    renderMessages();
    sendButton.disabled = true;
}

function handleSendMessage() {
    const messageInput = document.getElementById('messageInput');
    const inputValue = messageInput.value.trim();
    
    if (!inputValue) return;
    
    // Add user message
    const userMessage = {
        id: Date.now().toString(),
        content: inputValue,
        sender: 'user',
        timestamp: new Date()
    };
    
    messages.push(userMessage);
    messageInput.value = '';
    document.getElementById('sendButton').disabled = true;
    
    // Render messages and show typing indicator
    renderMessages();
    showTypingIndicator();
    
    // Simulate AI response
    setTimeout(() => {
        hideTypingIndicator();
        
        const aiMessage = {
            id: (Date.now() + 1).toString(),
            content: generateAIResponse(inputValue),
            sender: 'assistant',
            timestamp: new Date()
        };
        
        messages.push(aiMessage);
        renderMessages();
    }, 1500);
}

function generateAIResponse(userInput) {
    // Simple response generation based on user input
    const responses = [
        "Thank you for your message! I'm here to help you with any questions or tasks you might have.",
        "That's an interesting question. Let me help you work through that.",
        "I understand what you're looking for. Here's what I can suggest:",
        "Great question! Let me provide you with some helpful information.",
        "I'd be happy to assist you with that. Here's my recommendation:"
    ];
    
    // Check for specific keywords and provide contextual responses
    if (userInput.toLowerCase().includes('email')) {
        return "I can help you draft an email. What's the purpose of the email and who is your audience?";
    } else if (userInput.toLowerCase().includes('brainstorm') || userInput.toLowerCase().includes('ideas')) {
        return "I love brainstorming! Let me help you generate some creative ideas. What topic or project are you working on?";
    } else if (userInput.toLowerCase().includes('summarize')) {
        return "I can help you create a clear and concise summary. Please share the content you'd like me to summarize.";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
}

function renderMessages() {
    const chatMessages = document.getElementById('chatMessages');
    
    chatMessages.innerHTML = messages.map(message => {
        const isUser = message.sender === 'user';
        const avatarText = isUser ? 'U' : 'AI';
        
        return `
            <div class="message ${isUser ? 'user-message' : 'assistant-message'}">
                <div class="message-avatar">${avatarText}</div>
                <div class="message-content">
                    <p>${escapeHtml(message.content)}</p>
                </div>
            </div>
        `;
    }).join('');
    
    // Scroll to bottom
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
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}