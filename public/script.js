const form = document.getElementById('animateForm');
const imageUpload = document.getElementById('imageUpload');
const uploadArea = document.getElementById('uploadArea');
const imagePreview = document.getElementById('imagePreview');
const submitBtn = document.getElementById('submitBtn');
const statusSection = document.getElementById('statusSection');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const statusMessage = document.getElementById('statusMessage');
const progressFill = document.getElementById('progressFill');
const resultVideo = document.getElementById('resultVideo');
const downloadBtn = document.getElementById('downloadBtn');

let currentJobId = null;
let pollInterval = null;

// Handle file upload preview
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#6366f1';
    uploadArea.style.background = 'rgba(99, 102, 241, 0.15)';
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    uploadArea.style.background = '';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    uploadArea.style.background = '';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        imageUpload.files = e.dataTransfer.files;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Hide previous results/errors
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    
    // Show status section
    statusSection.style.display = 'block';
    statusMessage.textContent = 'Uploading image and starting generation...';
    progressFill.style.width = '20%';
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display = 'none';
    submitBtn.querySelector('.btn-loader').style.display = 'flex';
    
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/animate', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to start animation');
        }
        
        currentJobId = data.jobId;
        statusMessage.textContent = data.message || 'Video generation in progress...';
        progressFill.style.width = '40%';
        
        // Start polling for status
        startPolling();
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
        resetForm();
    }
});

// Poll for video status
function startPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
    }
    
    pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/status/${currentJobId}`);
            const data = await response.json();
            
            if (data.status === 'completed') {
                clearInterval(pollInterval);
                showResult(data.videoUrl);
                resetForm();
            } else {
                // Update progress (simulate progress)
                const currentProgress = parseInt(progressFill.style.width) || 40;
                if (currentProgress < 90) {
                    progressFill.style.width = `${Math.min(currentProgress + 5, 90)}%`;
                }
                statusMessage.textContent = 'Generating your video... This may take a few minutes.';
            }
        } catch (error) {
            console.error('Polling error:', error);
            clearInterval(pollInterval);
            showError('Failed to check status: ' + error.message);
            resetForm();
        }
    }, 5000); // Poll every 5 seconds
}

// Show result
function showResult(videoUrl) {
    statusSection.style.display = 'none';
    resultSection.style.display = 'block';
    resultVideo.src = videoUrl;
    progressFill.style.width = '100%';
    
    downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = `animated-${currentJobId}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
}

// Show error
function showError(message) {
    statusSection.style.display = 'none';
    errorSection.style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

// Reset form
function resetForm() {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').style.display = 'block';
    submitBtn.querySelector('.btn-loader').style.display = 'none';
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (pollInterval) {
        clearInterval(pollInterval);
    }
});

