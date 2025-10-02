// PWA Offline Tip System
let isOnline = navigator.onLine;
let workerId = null;

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

// Network Status
window.addEventListener('online', () => {
    isOnline = true;
    document.getElementById('offline-indicator').style.display = 'none';
    syncPendingTips();
});

window.addEventListener('offline', () => {
    isOnline = false;
    document.getElementById('offline-indicator').style.display = 'block';
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    workerId = getWorkerIdFromUrl();
    loadWorkerInfo();
    if (!isOnline) {
        document.getElementById('offline-indicator').style.display = 'block';
    }
});

function getWorkerIdFromUrl() {
    const path = window.location.pathname;
    return path.split('/').pop();
}

async function loadWorkerInfo() {
    try {
        if (isOnline) {
            const response = await fetch(`https://ttip-app.onrender.com/api/worker/${workerId}`);
            const worker = await response.json();
            
            document.getElementById('workerName').textContent = worker.name;
            document.getElementById('workerOccupation').textContent = worker.occupation;
            
            // Cache worker info for offline use
            localStorage.setItem(`worker_${workerId}`, JSON.stringify(worker));
        } else {
            // Load from cache
            const cached = localStorage.getItem(`worker_${workerId}`);
            if (cached) {
                const worker = JSON.parse(cached);
                document.getElementById('workerName').textContent = worker.name;
                document.getElementById('workerOccupation').textContent = worker.occupation;
            }
        }
    } catch (error) {
        console.error('Error loading worker:', error);
        document.getElementById('workerName').textContent = `Worker ${workerId}`;
    }
}

function processTip() {
    const amount = document.getElementById('amountInput').value;
    const customerPhone = prompt('Enter your phone number (254XXXXXXXXX):');
    
    if (!amount || !customerPhone) {
        showStatus('Please enter amount and phone number', 'error');
        return;
    }

    if (amount < 1 || amount > 10000) {
        showStatus('Amount must be between 1 and 10,000 KSh', 'error');
        return;
    }

    const tip = {
        id: generateId(),
        workerId: workerId,
        amount: parseInt(amount),
        customerPhone: customerPhone,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };

    if (isOnline) {
        // Process immediately
        processTipOnline(tip);
    } else {
        // Store for later
        storeTipOffline(tip);
        showStatus(`✅ Tip of KSh ${amount} queued! Will process when online.`, 'success');
        document.getElementById('amountInput').value = '';
    }
}

async function processTipOnline(tip) {
    try {
        const response = await fetch('https://ttip-app.onrender.com/api/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: tip.customerPhone,
                amount: tip.amount,
                workerId: tip.workerId
            })
        });

        const result = await response.json();
        
        if (result.ResponseCode === '0') {
            showStatus(`✅ Payment request sent! Check your phone for M-Pesa prompt.`, 'success');
            document.getElementById('amountInput').value = '';
        } else {
            throw new Error(result.ResponseDescription || 'Payment failed');
        }
    } catch (error) {
        showStatus(`❌ Error: ${error.message}`, 'error');
    }
}

function storeTipOffline(tip) {
    const pending = JSON.parse(localStorage.getItem('pendingTips') || '[]');
    pending.push(tip);
    localStorage.setItem('pendingTips', JSON.stringify(pending));
}

async function syncPendingTips() {
    const pending = JSON.parse(localStorage.getItem('pendingTips') || '[]');
    
    if (pending.length === 0) return;

    for (const tip of pending) {
        try {
            await processTipOnline(tip);
            // Remove from pending if successful
            const updated = pending.filter(p => p.id !== tip.id);
            localStorage.setItem('pendingTips', JSON.stringify(updated));
        } catch (error) {
            console.error('Sync failed for tip:', tip.id, error);
        }
    }
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    setTimeout(() => {
        status.style.display = 'none';
    }, 5000);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}