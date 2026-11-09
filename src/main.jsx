import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Android/desktop Chrome: keep the install prompt so the dashboard can offer an Install button later
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__vitaiqInstallPrompt = e })

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
