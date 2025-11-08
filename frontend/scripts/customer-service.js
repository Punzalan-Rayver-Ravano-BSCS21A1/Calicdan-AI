// Customer Service page functionality with EmailJS integration

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

// Main form submission handler with email integration
async function handleFormSubmit(e) {
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
    
    // Prepare ticket data
    const ticketData = {
        subject: subject.trim(),
        description: description.trim(),
        attachments: attachedFiles,
        timestamp: new Date().toISOString()
    };
    
    console.log('Support ticket submitted:', ticketData);
    
    // Show loading state
    if (window.AppUtils) {
        window.AppUtils.showNotification('Sending support ticket...', 'info');
    }
    
    // Send email and handle response
    const emailSent = await sendEmail(ticketData);
    
    if (emailSent) {
        // Show success message
        if (window.AppUtils) {
            window.AppUtils.showNotification('Support ticket submitted successfully! We\'ll get back to you soon.', 'success');
        }
        
        // Reset form
        resetForm();
    } else {
        // Show error message
        if (window.AppUtils) {
            window.AppUtils.showNotification('Failed to submit support ticket. Please try again.', 'error');
        }
    }
}

/**
 * Main email sending function
 * @param {Object} ticketData - The support ticket data
 * @returns {Promise<boolean>} - Returns true if email sent successfully, false otherwise
 */
async function sendEmail(ticketData) {
    const { subject, description, attachments } = ticketData;
    
    // EmailJS configuration
    const serviceID = 'service_ri53pum';
    const templateID = 'template_vyqyw3v';
    const publicKey = 'JxsG97jsOlLyBOn0s'; // REPLACE THIS with your actual EmailJS public key
    
    // Prepare template parameters
    const templateParams = {
        from_name: 'Customer Support Form',
        subject: subject,
        message: description,
        description: description,
        timestamp: new Date().toLocaleString(),
        attachments_count: attachments.length,
        attachments_list: attachments.length > 0 
            ? attachments.map(f => `${f.name} (${(f.size / 1024).toFixed(2)} KB)`).join(', ')
            : 'No attachments',
        reply_to: 'noreply@calicdan.com'
    };
    
    try {
        // Check if EmailJS is loaded
        if (typeof emailjs === 'undefined') {
            console.error('EmailJS library not loaded');
            return false;
        }
        
        // Initialize EmailJS with public key
        emailjs.init(publicKey);
        
        // Send email using EmailJS
        const response = await emailjs.send(serviceID, templateID, templateParams);
        
        // Check response status
        if (response.status === 200) {
            console.log('Email sent successfully:', response);
            return true;
        } else {
            console.error('Email sending failed with status:', response.status);
            return false;
        }
        
    } catch (error) {
        console.error('EmailJS error:', error);
        return false;
    }
}

// File handling functions
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