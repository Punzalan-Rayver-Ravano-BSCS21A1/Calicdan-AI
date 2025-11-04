// History page functionality

let chatSessions = [];

function getUserIdForHistory() {
    try {
        const sessionRaw = localStorage.getItem('calicdan-session');
        const session = sessionRaw ? JSON.parse(sessionRaw) : null;
        return session && session.user_id ? session.user_id : null;
    } catch (e) { return null; }
}

function getUserChatHistory() {
    const userId = getUserIdForHistory();
    if (!userId) return [];
    const currentKey = 'chatHistory_user_' + userId;
    const threadsKey = 'chatThreads_user_' + userId;
    try {
        const rawCurrent = localStorage.getItem(currentKey);
        const currentMessages = rawCurrent ? JSON.parse(rawCurrent) : [];
        const rawThreads = localStorage.getItem(threadsKey);
        const threads = rawThreads ? JSON.parse(rawThreads) : [];
        const all = [];
        // archived threads
        if (Array.isArray(threads)) {
            threads.forEach(t => { if (t && Array.isArray(t.messages)) all.push(t.messages); });
        }
        // include current conversation as last thread
        if (Array.isArray(currentMessages) && currentMessages.length) {
            all.push(currentMessages);
        }
        return all;
    } catch (e) { return []; }
}

function deriveSessionsFromMessages(allThreads) {
    // Each thread becomes one session card using the first user message as title/preview
    const sessions = allThreads.map((thread, idx) => {
        const firstUser = Array.isArray(thread) ? thread.find(m => m && m.sender === 'user') : null;
        const lastMsg = Array.isArray(thread) && thread.length ? thread[thread.length - 1] : null;
        return {
            id: String((firstUser && firstUser.id) || (Date.now() - idx)),
            title: ((firstUser && firstUser.content) || 'Conversation').slice(0, 40),
            preview: ((firstUser && firstUser.content) || '').slice(0, 80),
            timestamp: new Date((lastMsg && lastMsg.timestamp) || Date.now()).toLocaleDateString(),
            tags: []
        };
    });
    // Show most recent first
    return sessions.reverse();
}

let currentSearchQuery = '';
let currentDateFilter = '30';
let currentTagFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    initializeHistory();
});

function initializeHistory() {
    // Load per-user chat history into sessions
    const threads = getUserChatHistory();
    chatSessions = deriveSessionsFromMessages(threads);

    const searchInput = document.getElementById('searchInput');
    
    // Handle search input
    searchInput.addEventListener('input', function() {
        currentSearchQuery = this.value.toLowerCase();
        filterAndRenderSessions();
    });
    
    // Handle dropdown selections
    document.addEventListener('dropdownItemSelected', function(e) {
        const { value, dropdown } = e.detail;
        
        if (dropdown.querySelector('#dateFilter')) {
            currentDateFilter = value;
            updateDateFilterText(value);
        } else if (dropdown.querySelector('#tagFilter')) {
            currentTagFilter = value;
            updateTagFilterText(value);
        }
        
        filterAndRenderSessions();
    });
    
    // Handle session actions
    document.addEventListener('click', function(e) {
        if (e.target.closest('.dropdown-item') && e.target.textContent.includes('Delete')) {
            handleDeleteSession(e);
        }
    });
    
    // Initial render
    filterAndRenderSessions();
}

function updateDateFilterText(value) {
    const dateFilter = document.getElementById('dateFilter');
    const textMap = {
        '7': 'Last 7 days',
        '30': 'Last 30 days',
        '90': 'Last 3 months',
        'all': 'All time'
    };
    
    // Update button text
    const textNode = dateFilter.childNodes[2]; // Text node after the icon
    if (textNode) {
        textNode.textContent = textMap[value] || 'Last 30 days';
    }
}

function updateTagFilterText(value) {
    const tagFilter = document.getElementById('tagFilter');
    const textMap = {
        'all': 'All tags',
        'business': 'Business',
        'development': 'Development',
        'personal': 'Personal',
        'planning': 'Planning'
    };
    
    // Update button text
    const textNode = tagFilter.childNodes[2]; // Text node after the icon
    if (textNode) {
        textNode.textContent = textMap[value] || 'All tags';
    }
}

function filterAndRenderSessions() {
    let filteredSessions = [...chatSessions];
    
    // Apply search filter
    if (currentSearchQuery) {
        filteredSessions = filteredSessions.filter(session =>
            session.title.toLowerCase().includes(currentSearchQuery) ||
            session.preview.toLowerCase().includes(currentSearchQuery)
        );
    }
    
    // Apply tag filter
    if (currentTagFilter !== 'all') {
        filteredSessions = filteredSessions.filter(session =>
            session.tags.includes(currentTagFilter)
        );
    }
    
    // Apply date filter (simplified - in real app would use actual dates)
    // For demo purposes, we're keeping all sessions
    
    renderSessions(filteredSessions);
}

function renderSessions(sessions) {
    const chatSessionsContainer = document.getElementById('chatSessions');
    const noResults = document.getElementById('noResults');
    
    if (sessions.length === 0) {
        chatSessionsContainer.style.display = 'none';
        noResults.classList.remove('hidden');
        return;
    }
    
    chatSessionsContainer.style.display = 'flex';
    noResults.classList.add('hidden');
    
    chatSessionsContainer.innerHTML = sessions.map(session => `
        <div class="session-card" data-tags="${session.tags.join(',')}">
            <div class="session-content">
                <div class="session-header">
                    <h3 class="session-title">${escapeHtml(session.title)}</h3>
                    <div class="session-tags">
                        ${session.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                </div>
                
                <p class="session-preview">${escapeHtml(session.preview)}</p>
                
                <div class="session-meta">
                    <i data-lucide="clock"></i>
                    <span>${escapeHtml(session.timestamp)}</span>
                </div>
            </div>
            
            <div class="session-actions">
                <button class="btn btn-outline btn-sm">
                    <i data-lucide="archive"></i>
                </button>
                <div class="dropdown">
                    <button class="btn btn-outline btn-sm dropdown-trigger">
                        <i data-lucide="more-horizontal"></i>
                    </button>
                    <div class="dropdown-menu">
                        <button class="dropdown-item">Rename</button>
                        <button class="dropdown-item">Duplicate</button>
                        <button class="dropdown-item">Export</button>
                        <button class="dropdown-item text-destructive" data-session-id="${session.id}">
                            <i data-lucide="trash-2"></i>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Reinitialize Lucide icons for new content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function handleDeleteSession(e) {
    const sessionId = e.target.dataset.sessionId;
    if (!sessionId) return;
    
    if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
        // In a real app, this would make an API call
        const sessionIndex = chatSessions.findIndex(session => session.id === sessionId);
        if (sessionIndex > -1) {
            chatSessions.splice(sessionIndex, 1);
            filterAndRenderSessions();
            
            if (window.AppUtils) {
                window.AppUtils.showNotification('Conversation deleted successfully', 'success');
            }
        }
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>\"']/g, function(m) { return map[m]; });
}
