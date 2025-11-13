// History page functionality

let chatSessions = [];

function getUserIdForHistory() {
    try {
        const sessionRaw = localStorage.getItem('calicdan-session');
        const session = sessionRaw ? JSON.parse(sessionRaw) : null;
        return session && session.user_id ? session.user_id : null;
    } catch (e) { return null; }
}

function closeModal() {
    const modal = document.getElementById('customModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }, 200);
}

// Modal references
const modal = document.getElementById('customModal');

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

function getUserChatHistory() {
    const userId = getUserIdForHistory();
    if (!userId) return [];

    const threadsKey = 'chatThreads_user_' + userId;

    try {
        const rawThreads = localStorage.getItem(threadsKey);
        const threads = rawThreads ? JSON.parse(rawThreads) : [];

        return Array.isArray(threads)
            ? threads.filter(t => t && Array.isArray(t.messages) && t.id && t.endedAt)
            : [];
    } catch (e) {
        console.error("Failed to get chat history:", e);
        return [];
    }
}

function deriveSessionsFromMessages(allThreads) {
    if (!Array.isArray(allThreads)) return [];

    const sessions = allThreads
        .filter(thread => thread && thread.id)
        .map(thread => ({
            ...thread,
            id: thread.id,
            title: (thread.title ||
                (thread.messages?.find(m => m.sender === 'user')?.content) ||
                'Conversation').slice(0, 40),
            preview: (thread.messages?.find(m => m.sender === 'user')?.content || '').slice(0, 80),
            timestamp: new Date(thread.endedAt || Date.now()).toLocaleDateString(),
            endedAt: thread.endedAt || new Date().toISOString(), // keep raw for sorting
            tags: Array.isArray(thread.tags) ? thread.tags : []
        }));

    // Sort newest first
    sessions.sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt));

    return sessions;
}


let currentSearchQuery = '';
let currentDateFilter = '30';
let currentTagFilter = 'all';

document.addEventListener('DOMContentLoaded', initializeHistory);

async function initializeHistory() {
    let localThreads = getUserChatHistory();
    const backendThreads = await fetchChatSessionsFromBackend();

    let mergedThreads = [];

    if (backendThreads.length > 0) {
        // Merge backend threads with local renamed titles
        mergedThreads = backendThreads.map(bt => {
            const localThread = localThreads.find(lt => lt.id === bt.id);
            if (localThread && localThread.title) {
                // Keep local title if renamed
                return { ...bt, title: localThread.title };
            }
            return bt;
        });
    } else {
        mergedThreads = localThreads;
    }

    chatSessions = deriveSessionsFromMessages(mergedThreads);

    // Rest of initialization
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        currentSearchQuery = this.value.toLowerCase();
        filterAndRenderSessions();
    });

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

    filterAndRenderSessions();
    attachSessionCardClickListener();
}


function updateDateFilterText(value) {
    const dateFilter = document.getElementById('dateFilter');
    const textMap = {
        '7': 'Last 7 days',
        '30': 'Last 30 days',
        '90': 'Last 3 months',
        'all': 'All time'
    };
    const textNode = dateFilter.childNodes[2];
    if (textNode) textNode.textContent = textMap[value] || 'Last 30 days';
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
    const textNode = tagFilter.childNodes[2];
    if (textNode) textNode.textContent = textMap[value] || 'All tags';
}

function filterAndRenderSessions() {
    let filteredSessions = [...chatSessions];

    if (currentSearchQuery) {
        filteredSessions = filteredSessions.filter(session =>
            session.title.toLowerCase().includes(currentSearchQuery) ||
            session.preview.toLowerCase().includes(currentSearchQuery)
        );
    }

    if (currentTagFilter !== 'all') {
        filteredSessions = filteredSessions.filter(session =>
            session.tags.includes(currentTagFilter)
        );
    }

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

    chatSessionsContainer.innerHTML = ''; 
    chatSessionsContainer.innerHTML = sessions.map(session => `
        <div class="session-card" data-session-id="${session.id}" data-tags="${session.tags.join(',')}">
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
                        <button class="dropdown-item" data-action="rename">
                            <i data-lucide="edit-2"></i>Rename
                        </button>
                        <button class="dropdown-item" data-action="duplicate">
                            <i data-lucide="copy"></i>Duplicate
                        </button>
                        <button class="dropdown-item" data-action="export">
                            <i data-lucide="download"></i>Export
                        </button>
                        <button class="dropdown-item text-destructive" data-action="delete" data-session-id="${session.id}">
                            <i data-lucide="trash-2"></i>Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function attachSessionCardClickListener() {
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.dropdown-trigger');
        if (trigger) {
            const dropdown = trigger.parentElement;
            const menu = dropdown.querySelector('.dropdown-menu');
            if (menu) menu.classList.toggle('show');

            document.querySelectorAll('.dropdown-menu.show').forEach(otherMenu => {
                if (otherMenu !== menu) otherMenu.classList.remove('show');
            });
            return;
        }

        const dropdownItem = e.target.closest('.dropdown-item');
        if (dropdownItem) {
            const card = dropdownItem.closest('.session-card');
            if (!card) return;
            const sessionId = card.dataset.sessionId;
            if (!sessionId) return;

            const action = dropdownItem.dataset.action;
            switch(action) {
                case 'delete':
                    console.log("[UI] Delete clicked on card ID:", sessionId);
                    handleDeleteSession(sessionId);
                    break;
                case 'rename':
                    renameSession(sessionId);
                    break;
                case 'duplicate':
                    duplicateSession(sessionId);
                    break;
                case 'export':
                    exportSession(sessionId);
                    break;
            }

            const menu = dropdownItem.closest('.dropdown-menu');
            if (menu) menu.classList.remove('show');
            return;
        }

        const card = e.target.closest('.session-card');
        if (card && !e.target.closest('button, .dropdown, .dropdown-item, i')) {
            const sessionId = card.dataset.sessionId;
            if (sessionId) resumeConversation(sessionId);
        }

        document.querySelectorAll('.dropdown-menu.show').forEach(menu => menu.classList.remove('show'));
    });
}

async function resumeConversation(sessionId) {
    const sessionRaw = localStorage.getItem('calicdan-session');
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    const session_token = session ? session.session_token : null;

    if (!session_token) {
        alert("Session expired. Please log in again.");
        return;
    }

    const backendUrl = window.AuthModule?.BACKEND_URL || 'http://127.0.0.1:8000';

    try {
        const res = await fetch(`${backendUrl}/chat/sessions`, {
            headers: {
                'Authorization': `Bearer ${session_token}`
            }
        });

        if (!res.ok) throw new Error("Failed to fetch session");

        const sessions = await res.json();
        const selected = sessions.find(s => s.id === sessionId);

        if (!selected) {
            alert("Conversation not found.");
            return;
        }

        // Save the selected conversation as the active chat
        const userId = getUserIdForHistory();
        const activeKey = 'calicdan-activeSession_user_' + userId;
        localStorage.setItem(activeKey, JSON.stringify({
            sessionId: selected.id,
            messages: selected.messages
        }));

        // Navigate to chat page
        window.location.href = 'chat.html';

    } catch (err) {
        console.error("Failed to load session from backend:", err);
        alert("Could not load conversation from server.");
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
    return text.replace(/[&<>"']/g, m => map[m]);
}

function duplicateSession(sessionId) {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    const duplicate = { ...session, id: generateUniqueId() };
    chatSessions.unshift(duplicate);
    updateLocalStorage();
    filterAndRenderSessions();
    if (window.AppUtils) window.AppUtils.showNotification('Conversation duplicated', 'success');
}

function exportSession(sessionId) {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${session.title}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    if (window.AppUtils) window.AppUtils.showNotification('Conversation exported', 'success');
}

function generateUniqueId() {
    return 'id-' + Math.random().toString(36).substring(2, 12);
}

async function handleDeleteSession(sessionId) {
    if (!sessionId) return;

    const sessionRaw = localStorage.getItem('calicdan-session');
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    const session_token = session ? session.session_token : null;

    if (!session_token) {
        alert("Session expired. Please log in again.");
        return;
    }

    const backendUrl = window.BACKEND_URL || 'http://127.0.0.1:8000';
    const card = document.querySelector(`.session-card[data-session-id="${sessionId}"]`);

    showModal({
        title: 'Delete Conversation',
        message: 'Are you sure you want to delete this conversation? This cannot be undone.',
        onConfirm: async () => {
            try {
                const response = await fetch(`${backendUrl}/chat/sessions/${sessionId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session_token}`,
                    },
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.detail || 'Failed to delete session');
                }

                chatSessions = chatSessions.filter(s => s.id !== sessionId);
                updateLocalStorage();

                if (card) {
                    card.style.transition = 'opacity 0.2s, transform 0.2s';
                    card.style.opacity = 0;
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        card.remove();
                        if (window.AppUtils) window.AppUtils.showNotification('Conversation deleted', 'success');
                    }, 200);
                } else {
                    if (window.AppUtils) window.AppUtils.showNotification('Conversation deleted', 'success');
                }
            } catch (err) {
                console.error(err);
                if (window.AppUtils) window.AppUtils.showNotification(`Failed to delete conversation: ${err.message}`, 'error');
            }
        }
    });
}

function showModal({ title, message, inputValue, onConfirm }) {
    const modal = document.getElementById('customModal');
    const modalTitle = modal.querySelector('#modalTitle');
    const modalMessage = modal.querySelector('#modalMessage');
    const modalInput = modal.querySelector('#modalInput');
    const modalConfirm = modal.querySelector('#modalConfirm');
    const modalCancel = modal.querySelector('#modalCancel');

    modalTitle.textContent = title || '';
    modalMessage.textContent = message || '';

    if (inputValue !== undefined) {
        modalInput.value = inputValue;
        modalInput.classList.remove('hidden');
    } else {
        modalInput.classList.add('hidden');
    }

    modalConfirm.replaceWith(modalConfirm.cloneNode(true));
    modalCancel.replaceWith(modalCancel.cloneNode(true));

    const newConfirm = modal.querySelector('#modalConfirm');
    const newCancel = modal.querySelector('#modalCancel');

    const confirmHandler = () => {
        if (typeof onConfirm === 'function') onConfirm(modalInput.value);
        closeModal();
    };

    const cancelHandler = () => {
        closeModal();
    };

    newConfirm.addEventListener('click', confirmHandler);
    newCancel.addEventListener('click', cancelHandler);

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    modal.classList.add('show');

    setTimeout(() => {
        modalInput.focus();
    }, 50);
}

function renameSession(sessionId) {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    showModal({
        title: 'Rename Conversation',
        message: 'Enter a new title:',
        inputValue: session.title,
        onConfirm: (newName) => {
            if (!newName) return;
            // Use the centralized function for renaming
            setCustomChatTitle(sessionId, newName);
        }
    });
}


function setCustomChatTitle(sessionId, newTitle) {
    if (!sessionId) return;

    // Update in-memory array
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) session.title = newTitle.slice(0, 40);

    // Update localStorage
    const userId = getUserIdForHistory();
    const threadsKey = `chatThreads_user_${userId}`;
    let threads = JSON.parse(localStorage.getItem(threadsKey) || "[]");
    const thread = threads.find(t => t.id === sessionId);
    if (thread) thread.title = newTitle.slice(0, 40);
    localStorage.setItem(threadsKey, JSON.stringify(threads));

    // Refresh UI
    filterAndRenderSessions();
    if (window.AppUtils) window.AppUtils.showNotification('Conversation renamed', 'success');
}


function updateLocalStorage() {
    const userId = getUserIdForHistory();
    if (!userId) return;

    const threadsKey = 'chatThreads_user_' + userId;

    const threadsToSave = chatSessions
        .filter(s => s && s.id && Array.isArray(s.messages))
        .map(s => ({
            id: s.id,
            title: s.title || 'Conversation',
            messages: s.messages,
            endedAt: s.endedAt || new Date().toISOString(),
            tags: Array.isArray(s.tags) ? s.tags : []
        }));

    localStorage.setItem(threadsKey, JSON.stringify(threadsToSave));
}

async function fetchChatSessionsFromBackend() {
    const sessionRaw = localStorage.getItem('calicdan-session');
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    if (!session || !session.session_token) return [];

    const backendUrl = window.AuthModule?.BACKEND_URL || 'http://127.0.0.1:8000';

    try {
        const res = await fetch(`${backendUrl}/chat/sessions`, {   // ✅ FIXED URL
            headers: {
                'Authorization': `Bearer ${session.session_token}`
            }
        });

        if (!res.ok) throw new Error('Failed to fetch sessions');

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error fetching chat sessions:", err);
        return []; // fallback to local history
    }
}

