// Customer Service page functionality

let attachedFiles = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeCustomerService();
});

function initializeCustomerService() {
    const supportForm = document.getElementById('supportForm');
    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('fileInput');
    
    // Handle form submission
    supportForm.addEventListener('submit', handleFormSubmit);
    
    // Handle file upload area click
    fileUpload.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Handle file input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Handle drag and drop
    fileUpload.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('drag-over');
    });
    
    fileUpload.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
    });
    
    fileUpload.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });
    
    // Handle quick link and contact option clicks
    const linkItems = document.querySelectorAll('.link-item');
    linkItems.forEach(item => {
        item.addEventListener('click', function() {
            const title = this.querySelector('.link-title').textContent;
            if (window.AppUtils) {
                window.AppUtils.showNotification(`Opening ${title}...`, 'info');
            }
        });
    });
    
    const contactItems = document.querySelectorAll('.contact-item');
    contactItems.forEach(item => {
        item.addEventListener('click', function() {
            const title = this.querySelector('.contact-title').textContent;
            if (window.AppUtils) {
                window.AppUtils.showNotification(`Connecting to ${title}...`, 'info');
            }
        });
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const subject = formData.get('subject') || document.getElementById('subject').value;
    const description = formData.get('description') || document.getElementById('description').value;
    
    // Validate form
    if (!subject.trim()) {
        if (window.AppUtils) {
            window.AppUtils.showNotification('Please enter a brief subject', 'error');
        }
        return;
    }
    
    if (!description.trim()) {
        if (window.AppUtils) {
            window.AppUtils.showNotification('Please provide a description of your issue', 'error');
        }
        return;
    }
    
    // Simulate form submission
    const submitData = {
        subject: subject.trim(),
        description: description.trim(),
        attachments: attachedFiles.map(file => file.name),
        timestamp: new Date().toISOString()
    };
    
    console.log('Support ticket submitted:', submitData);
    
    // Show success message
    if (window.AppUtils) {
        window.AppUtils.showNotification('Support ticket submitted successfully! We\'ll get back to you soon.', 'success');
    }
    
    // Reset form
    resetForm();
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

function handleFiles(files) {
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    files.forEach(file => {
        // Check file size
        if (file.size > maxFileSize) {
            if (window.AppUtils) {
                window.AppUtils.showNotification(`File "${file.name}" is too large. Maximum size is 10MB.`, 'error');
            }
            return;
        }
        
        // Check file type
        if (!allowedTypes.includes(file.type)) {
            if (window.AppUtils) {
                window.AppUtils.showNotification(`File type not allowed: "${file.name}"`, 'error');
            }
            return;
        }
        
        // Check if file already exists
        if (attachedFiles.some(f => f.name === file.name && f.size === file.size)) {
            if (window.AppUtils) {
                window.AppUtils.showNotification(`File "${file.name}" is already attached`, 'error');
            }
            return;
        }
        
        // Add file to attached files
        attachedFiles.push(file);
    });
    
    renderAttachedFiles();
}

function renderAttachedFiles() {
    const fileList = document.getElementById('fileList');
    
    if (attachedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    
    fileList.innerHTML = attachedFiles.map((file, index) => `
        <div class="file-item">
            <span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
            <button type="button" class="file-remove" onclick="removeFile(${index})">
                Remove
            </button>
        </div>
    `).join('');
}

function removeFile(index) {
    attachedFiles.splice(index, 1);
    renderAttachedFiles();
    
    // Clear the file input
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
}

function resetForm() {
    document.getElementById('subject').value = '';
    document.getElementById('description').value = '';
    attachedFiles = [];
    renderAttachedFiles();
    
    // Clear the file input
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
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

// Make removeFile function globally available
window.removeFile = removeFile;