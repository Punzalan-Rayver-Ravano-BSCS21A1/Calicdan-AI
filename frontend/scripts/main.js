// Main JavaScript - Shared functionality across all pages

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    initializeDropdowns();
    initializeActiveNavigation();
});

// Dropdown functionality
function initializeDropdowns() {
    document.addEventListener('click', function(e) {
        // Close all dropdowns when clicking outside
        if (!e.target.closest('.dropdown')) {
            closeAllDropdowns();
        }
    });

    // Handle dropdown triggers
    const dropdownTriggers = document.querySelectorAll('.dropdown-trigger');
    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = this.closest('.dropdown');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            // Close other dropdowns
            closeAllDropdowns(dropdown);
            
            // Toggle current dropdown
            menu.classList.toggle('show');
        });
    });

    // Handle dropdown items
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const dropdown = this.closest('.dropdown');
            const trigger = dropdown.querySelector('.dropdown-trigger');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            // Update trigger text if it has a value
            if (this.dataset.value && trigger.childNodes.length > 2) {
                // Find text node and update it
                const textNodes = Array.from(trigger.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                if (textNodes.length > 0) {
                    textNodes[textNodes.length - 1].textContent = this.textContent.trim();
                }
            }
            
            // Close dropdown
            menu.classList.remove('show');
            
            // Emit custom event for handling in specific pages
            const customEvent = new CustomEvent('dropdownItemSelected', {
                detail: {
                    value: this.dataset.value,
                    text: this.textContent.trim(),
                    dropdown: dropdown
                }
            });
            document.dispatchEvent(customEvent);
        });
    });
}

function closeAllDropdowns(except = null) {
    const dropdownMenus = document.querySelectorAll('.dropdown-menu');
    dropdownMenus.forEach(menu => {
        if (!except || !except.contains(menu)) {
            menu.classList.remove('show');
        }
    });
}

// Set active navigation based on current page
function initializeActiveNavigation() {
    const currentPath = window.location.pathname;
    const fileName = currentPath.split('/').pop() || 'index.html';
    
    // Update sidebar navigation
    const sidebarLinks = document.querySelectorAll('.sidebar .nav-item');
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === fileName || (fileName === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Update top navigation
    const topNavLinks = document.querySelectorAll('.top-nav .tab-item');
    topNavLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === fileName || (fileName === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Utility functions
function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow-medium);
        z-index: 1000;
        font-size: 14px;
        max-width: 300px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.borderLeftColor = 'var(--success)';
        notification.style.borderLeftWidth = '4px';
    } else if (type === 'error') {
        notification.style.borderLeftColor = 'var(--destructive)';
        notification.style.borderLeftWidth = '4px';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Export utility functions for use in other scripts
window.AppUtils = {
    showNotification,
    closeAllDropdowns
};