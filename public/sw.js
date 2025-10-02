// Service Worker for PWA Offline Functionality
const CACHE_NAME = 'ttip-pwa-v1';
const urlsToCache = [
  '/',
  '/app.js',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch Event - Serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Background Sync for pending tips
self.addEventListener('sync', event => {
  if (event.tag === 'sync-tips') {
    event.waitUntil(syncPendingTips());
  }
});

async function syncPendingTips() {
  // This will be called when connection is restored
  const pending = JSON.parse(localStorage.getItem('pendingTips') || '[]');
  
  for (const tip of pending) {
    try {
      await fetch('https://ttip-app.onrender.com/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: tip.customerPhone,
          amount: tip.amount,
          workerId: tip.workerId
        })
      });
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
}