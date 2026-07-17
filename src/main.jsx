import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import 'leaflet/dist/leaflet.css'

// Register PWA Service Worker with Auto-Update logic
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('RunRajya PWA Service Worker Registered!');

        // FORCE UPDATE CHECK: 
        // This prevents the "stuck at loading" issue by checking the server 
        // for new code every time the page is opened.
        registration.update();

        // Optional: If a new service worker is found and installed, 
        // it will notify the console.
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New version detected. Please refresh for the latest tactical updates.');
              }
            };
          }
        };
      })
      .catch(err => console.warn('RunRajya PWA registration failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)