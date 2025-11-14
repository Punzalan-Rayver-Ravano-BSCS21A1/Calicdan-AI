// Settings page functionality

let settings = {
    appearance: {
        theme: 'light',
        highContrast: false,
    },
    chat: {
        messageDensity: 'comfortable',
        showTimestamps: true,
    },
    privacy: {
        shareData: false,
        analytics: true,
    },
    notifications: {
        email: true,
        push: true,
        desktop: false,
    },
};

// Mock API key for demonstration
let apiKey = 'sk_live_1234567890abcdefghijklmnopqrstuvwxyz';
let isApiKeyVisible = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
});

function initializeSettings() {
    initializeNavigation();
    initializeFormControls();
    initializeApiKeyControls();
    loadSettings();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function initializeNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const category = this.dataset.category;
            switchToCategory(category);
        });
    });
}

function switchToCategory(category) {
    // Update navigation
    const navItems = document.querySelectorAll('.settings-nav-item');
    navItems.forEach(item => {
        if (item.dataset.category === category) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Update panels
    const panels = document.querySelectorAll('.settings-panel');
    panels.forEach(panel => {
        if (panel.id === category) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
    
    // Reinitialize icons after panel switch
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function initializeFormControls() {
    // Theme select
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            settings.appearance.theme = this.value;
            applyTheme(this.value);
            saveSettings();
        });
    }
    
    // High contrast toggle
    const highContrastToggle = document.getElementById('highContrast');
    if (highContrastToggle) {
        highContrastToggle.addEventListener('change', function() {
            settings.appearance.highContrast = this.checked;
            document.documentElement.classList.toggle('high-contrast', this.checked);
            saveSettings();
        });
    }
    
    // Message density select
    const messageDensitySelect = document.getElementById('messageDensity');
    if (messageDensitySelect) {
        messageDensitySelect.addEventListener('change', function() {
            settings.chat.messageDensity = this.value;
            saveSettings();
        });
    }
    
    // Show timestamps toggle
    const showTimestampsToggle = document.getElementById('showTimestamps');
    if (showTimestampsToggle) {
        showTimestampsToggle.addEventListener('change', function() {
            settings.chat.showTimestamps = this.checked;
            saveSettings();
        });
    }
    
    // Email notifications toggle
    const emailNotificationsToggle = document.getElementById('emailNotifications');
    if (emailNotificationsToggle) {
        emailNotificationsToggle.addEventListener('change', function() {
            settings.notifications.email = this.checked;
            saveSettings();
        });
    }
    
    // Push notifications toggle
    const pushNotificationsToggle = document.getElementById('pushNotifications');
    if (pushNotificationsToggle) {
        pushNotificationsToggle.addEventListener('change', function() {
            settings.notifications.push = this.checked;
            saveSettings();
        });
    }
    
    // Desktop notifications toggle
    const desktopNotificationsToggle = document.getElementById('desktopNotifications');
    if (desktopNotificationsToggle) {
        desktopNotificationsToggle.addEventListener('change', function() {
            settings.notifications.desktop = this.checked;
            saveSettings();
        });
    }
    
    // Privacy actions
    const clearDataBtn = document.getElementById('clearHistoryBtn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', handleClearData);
    }
    
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', handleExportData);
    }
    
    // Save changes button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            saveSettings();
            showNotification('Settings saved successfully!', 'success');
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleResetSettings);
    }
}

function initializeApiKeyControls() {
    // Toggle key visibility
    const toggleKeyBtn = document.getElementById('toggleKeyVisibility');
    const apiKeyInput = document.getElementById('apiKeyInput');
    
    if (toggleKeyBtn && apiKeyInput) {
        toggleKeyBtn.addEventListener('click', function() {
            isApiKeyVisible = !isApiKeyVisible;
            apiKeyInput.type = isApiKeyVisible ? 'text' : 'password';
            
            // Update icon
            const icon = toggleKeyBtn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', isApiKeyVisible ? 'eye-off' : 'eye');
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        });
    }
    
    // Copy API key
    const copyKeyBtn = document.getElementById('copyKeyBtn');
    if (copyKeyBtn && apiKeyInput) {
        copyKeyBtn.addEventListener('click', async function() {
            try {
                await navigator.clipboard.writeText(apiKey);
                showNotification('API key copied to clipboard', 'success');
                
                // Visual feedback
                const originalText = copyKeyBtn.innerHTML;
                copyKeyBtn.innerHTML = '<i data-lucide="check"></i> Copied';
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                setTimeout(() => {
                    copyKeyBtn.innerHTML = originalText;
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                }, 2000);
            } catch (err) {
                showNotification('Failed to copy API key', 'error');
            }
        });
    }
    
    // Regenerate API key
    const regenerateKeyBtn = document.getElementById('regenerateKeyBtn');
    if (regenerateKeyBtn && apiKeyInput) {
        regenerateKeyBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to regenerate your API key? This will invalidate the current key and may break existing integrations.')) {
                // Generate a new mock API key
                apiKey = 'sk_live_' + generateRandomString(40);
                apiKeyInput.value = apiKey;
                showNotification('API key regenerated successfully', 'success');
                
                // Save to localStorage
                localStorage.setItem('calicdan-api-key', apiKey);
            }
        });
    }
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function applyTheme(theme) {
    if (theme === 'system') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

function getSettingsStorageKey() {
    try {
        const sessionRaw = localStorage.getItem('calicdan-session');
        const session = sessionRaw ? JSON.parse(sessionRaw) : null;
        if (session && session.user_id) return 'calicdan-settings_user_' + session.user_id;
    } catch (e) {}
    return 'calicdan-settings';
}

function loadSettings() {
    // Load settings from per-user localStorage or use defaults
    const savedSettings = localStorage.getItem(getSettingsStorageKey());
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }
    
    // Load API key from localStorage
    const savedApiKey = localStorage.getItem('calicdan-api-key');
    if (savedApiKey) {
        apiKey = savedApiKey;
        const apiKeyInput = document.getElementById('apiKeyInput');
        if (apiKeyInput) {
            apiKeyInput.value = apiKey;
        }
    }
    
    // Apply settings to form controls
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = settings.appearance.theme;
        applyTheme(settings.appearance.theme);
    }
    
    const highContrastToggle = document.getElementById('highContrast');
    if (highContrastToggle) {
        highContrastToggle.checked = settings.appearance.highContrast;
        document.documentElement.classList.toggle('high-contrast', settings.appearance.highContrast);
    }
    
    const messageDensitySelect = document.getElementById('messageDensity');
    if (messageDensitySelect) {
        messageDensitySelect.value = settings.chat.messageDensity;
    }
    
    const showTimestampsToggle = document.getElementById('showTimestamps');
    if (showTimestampsToggle) {
        showTimestampsToggle.checked = settings.chat.showTimestamps;
    }
    
    const emailNotificationsToggle = document.getElementById('emailNotifications');
    if (emailNotificationsToggle) {
        emailNotificationsToggle.checked = settings.notifications.email;
    }
    
    const pushNotificationsToggle = document.getElementById('pushNotifications');
    if (pushNotificationsToggle) {
        pushNotificationsToggle.checked = settings.notifications.push;
    }
    
    const desktopNotificationsToggle = document.getElementById('desktopNotifications');
    if (desktopNotificationsToggle) {
        desktopNotificationsToggle.checked = settings.notifications.desktop;
    }
    
    // Load account info
    const accountEmail = document.getElementById('accountEmail');
    if (accountEmail && window.AuthModule) {
        const session = window.AuthModule.getSession();
        if (session && session.email) {
            accountEmail.textContent = session.email;
        }
    }
}

function saveSettings() {
    localStorage.setItem(getSettingsStorageKey(), JSON.stringify(settings));
}

function handleClearData() {
    if (confirm('Are you sure you want to permanently remove all your past chats? This action cannot be undone.')) {
        // In a real app, this would make an API call
        localStorage.removeItem('calicdan-chat-history');
        showNotification('Chat history cleared successfully', 'success');
    }
}

function handleExportData() {
    // Create a simple data export
    const exportData = {
        settings: settings,
        timestamp: new Date().toISOString(),
        version: '1.2.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'calicdan-data-export-' + new Date().toISOString().split('T')[0] + '.json';
    link.click();
    
    showNotification('Data exported successfully', 'success');
}

function handleResetSettings() {
    if (confirm('Are you sure you want to reset all settings to their default values?')) {
        // Reset to default settings
        settings = {
            appearance: {
                theme: 'light',
                highContrast: false,
            },
            chat: {
                messageDensity: 'comfortable',
                showTimestamps: true,
            },
            privacy: {
                shareData: false,
                analytics: true,
            },
            notifications: {
                email: true,
                push: true,
                desktop: false,
            },
        };
        
        loadSettings();
        saveSettings();
        showNotification('Settings reset to defaults', 'success');
    }
}

function showNotification(message, type = 'info') {
    // Use AppUtils if available
    if (window.AppUtils && typeof window.AppUtils.showNotification === 'function') {
        window.AppUtils.showNotification(message, type);
        return;
    }
    
    // Fallback notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--destructive)' : 'var(--primary)'};
        color: white;
        border-radius: var(--radius);
        box-shadow: var(--shadow-large);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Listen for system theme changes
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (settings.appearance.theme === 'system') {
            applyTheme('system');
        }
    });
}
