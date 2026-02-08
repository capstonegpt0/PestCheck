// src/utils/registerPWA.js

/**
 * Register Service Worker and handle PWA updates
 */
export function registerPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);

          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                showUpdateNotification();
              }
            });
          });
        })
        .catch((error) => {
          console.log('❌ Service Worker registration failed:', error);
        });
    });
  }
}

/**
 * Show update notification to user
 */
function showUpdateNotification() {
  const updateBanner = document.createElement('div');
  updateBanner.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 90%;
    ">
      <span>New version available!</span>
      <button 
        onclick="window.location.reload()"
        style="
          background: white;
          color: #10b981;
          border: none;
          padding: 6px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        "
      >
        Update Now
      </button>
    </div>
  `;
  
  document.body.appendChild(updateBanner);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    updateBanner.remove();
  }, 10000);
}

/**
 * Check if app is installed as PWA
 */
export function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Get install prompt and show custom UI
 */
export function setupInstallPrompt() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Dispatch custom event that components can listen to
    window.dispatchEvent(new CustomEvent('pwa-installable', { 
      detail: { prompt: deferredPrompt } 
    }));
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    deferredPrompt = null;
  });

  return deferredPrompt;
}

/**
 * Check online/offline status
 */
export function setupOfflineDetection() {
  window.addEventListener('online', () => {
    console.log('✅ Back online');
  });

  window.addEventListener('offline', () => {
    console.log('📡 Offline mode');
  });
}