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

document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
});

function initializeSettings() {
    initializeNavigation();
    initializeFormControls();
    loadSettings();
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
}

function initializeFormControls() {
    // Theme select
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            settings.appearance.theme = this.value;
            saveSettings();
        });
    }
    
    // High contrast toggle
    const highContrastToggle = document.getElementById('highContrast');
    if (highContrastToggle) {
        highContrastToggle.addEventListener('change', function() {
            settings.appearance.highContrast = this.checked;
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
    const clearDataBtn = document.querySelector('.privacy-card .btn-destructive');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', handleClearData);
    }
    
    const exportDataBtn = document.querySelector('.privacy-card .btn-outline');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', handleExportData);
    }
    
    // Save changes button
    const saveBtn = document.querySelector('.page-actions .btn-primary');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            if (window.AppUtils) {
                window.AppUtils.showNotification('Settings saved successfully!', 'success');
            }
        });
    }
    
    // Reset button
    const resetBtn = document.querySelector('.page-actions .btn-outline');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleResetSettings);
    }
}

function loadSettings() {
    // Load settings from localStorage or use defaults
    const savedSettings = localStorage.getItem('calicdan-settings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }
    
    // Apply settings to form controls
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = settings.appearance.theme;
    }
    
    const highContrastToggle = document.getElementById('highContrast');
    if (highContrastToggle) {
        highContrastToggle.checked = settings.appearance.highContrast;
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
}

function saveSettings() {
    localStorage.setItem('calicdan-settings', JSON.stringify(settings));
}

function handleClearData() {
    if (confirm('Are you sure you want to permanently remove all your past chats? This action cannot be undone.')) {
        // In a real app, this would make an API call
        localStorage.removeItem('calicdan-chat-history');
        
        if (window.AppUtils) {
            window.AppUtils.showNotification('Chat history cleared successfully', 'success');
        }
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
    link.download = 'calicdan-data-export.json';
    link.click();
    
    if (window.AppUtils) {
        window.AppUtils.showNotification('Data exported successfully', 'success');
    }
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
        
        if (window.AppUtils) {
            window.AppUtils.showNotification('Settings reset to defaults', 'success');
        }
    }
}