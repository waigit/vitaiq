import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Android/desktop Chrome: keep the install prompt so the dashboard can offer an Install button later
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__vitaiqInstallPrompt = e })

// If anything crashes while rendering, show a message instead of a blank black page
class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('VitaIQ crashed:', error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0A0A0F', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧬</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>VitaIQ hit a snag</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>Something went wrong while loading this page. Your saved data on this device has not been touched.</p>
          <code style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20, wordBreak: 'break-word' }}>{String(this.state.error?.message || this.state.error)}</code>
          <button onClick={() => location.reload()} style={{ background: '#00FF88', color: '#0A0A0F', border: 0, borderRadius: 12, padding: '12px 24px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Reload</button>
          <button onClick={() => { if (confirm('Clear the health data saved in this browser and go back to the start? Your Apple Watch data is not affected — you can upload your export again.')) { try { localStorage.removeItem('vitaiq_health_data') } catch {} location.reload() } }} style={{ display: 'block', margin: '14px auto 0', background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}>Start over on this browser</button>
        </div>
      </div>
    )
  }
}

createRoot(document.getElementById("root")).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>);
