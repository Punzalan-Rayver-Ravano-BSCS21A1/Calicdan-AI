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
        if (window.AppUtils) window.AppUtils.showNotification('Please enter a brief subject', 'error');
        return;
    }
    
    if (!description.trim()) {
        if (window.AppUtils) window.AppUtils.showNotification('Please provide a description of your issue', 'error');
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
    
    if (window.AppUtils) window.AppUtils.showNotification('Sending support ticket...', 'info');
    
    const emailSent = await sendEmail(ticketData);
    
    if (emailSent) {
        if (window.AppUtils) window.AppUtils.showNotification('Support ticket submitted successfully! We\'ll get back to you soon.', 'success');
        resetForm();
    } else {
        if (window.AppUtils) window.AppUtils.showNotification('Failed to submit support ticket. Please try again.', 'error');
    }
}

/**
 * Main email sending function using EmailJS
 * Supports actual file attachments in base64 format
 */
async function sendEmail(ticketData) {
    const { subject, description, attachments } = ticketData;

    const serviceID = 'service_ri53pum';
    const templateID = 'template_vyqyw3v';

    // Convert attachments to base64 strings
    const base64Attachments = await Promise.all(
        attachments.map(file => fileToBase64(file))
    );

    const templateParams = {
        from_name: 'Customer Support Form',
        subject: subject,
        message: description,
        description: description,
        timestamp: new Date().toLocaleString(),
        attachments_count: attachments.length,
        attachments_list: attachments.length > 0
            ? attachments.map(f => f.name).join(', ')
            : 'No attachments',
        reply_to: 'noreply@calicdan.com',
        attachments: base64Attachments // EmailJS template must support attachments field
    };

    try {
        if (typeof emailjs === 'undefined') {
            console.error('EmailJS library not loaded');
            return false;
        }

        // Initialize EmailJS with your public key
        if (!emailjs.init) emailjs.init('YOUR_PUBLIC_KEY_HERE'); // replace with your public key

        const response = await emailjs.send(serviceID, templateID, templateParams);

        if (response.status === 200) {
            console.log('Email sent successfully:', response);
            return true;
        } else {
            console.error('Email sending failed with status:', response.status, response.text);
            return false;
        }
    } catch (error) {
        console.error('EmailJS error:', error);
        return false;
    }
}

// Convert File to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ name: file.name, data: reader.result });
        reader.onerror = error => reject(error);
    });
}

// File handling
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
        if (file.size > maxFileSize) {
            if (window.AppUtils) window.AppUtils.showNotification(`File "${file.name}" is too large. Maximum size is 10MB.`, 'error');
            return;
        }
        if (!allowedTypes.includes(file.type)) {
            if (window.AppUtils) window.AppUtils.showNotification(`File type not allowed: "${file.name}"`, 'error');
            return;
        }
        if (attachedFiles.some(f => f.name === file.name && f.size === file.size)) {
            if (window.AppUtils) window.AppUtils.showNotification(`File "${file.name}" is already attached`, 'error');
            return;
        }
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
    document.getElementById('fileInput').value = '';
}

function resetForm() {
    document.getElementById('subject').value = '';
    document.getElementById('description').value = '';
    attachedFiles = [];
    renderAttachedFiles();
    document.getElementById('fileInput').value = '';
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

window.removeFile = removeFile;
