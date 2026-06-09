import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register Service Worker for PWA + Background Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered');

      // Listen for messages from the Service Worker (e.g., START_URGENT_SIREN)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'START_URGENT_SIREN') {
          // Dispatch a custom DOM event that Layout.jsx listens to
          window.dispatchEvent(new CustomEvent('sw-urgent-siren'));
        }
      });

      // Store SW registration globally so Layout.jsx can subscribe to push
      window.__swRegistration = registration;
      window.dispatchEvent(new CustomEvent('sw-ready', { detail: registration }));

    } catch (err) {
      console.warn('Service Worker registration failed:', err);
    }
  });
}
