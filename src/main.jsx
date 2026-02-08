import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerPWA, setupInstallPrompt, setupOfflineDetection } from './utils/registerPWA'

// Register PWA
registerPWA()
setupInstallPrompt()
setupOfflineDetection()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)