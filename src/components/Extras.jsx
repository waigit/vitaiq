// VitaIQ — streaks, daily check-in, share card, install hint, history note.
import { useState, useEffect } from 'react'
import { CHECKIN_TAGS, loadCheckins, saveCheckin, localDay, computeCheckinInsights } from '../lib/insights'
import { drawWeekCard, shareOrDownload } from '../lib/shareCard'
import { shortcutRunUrl, isAppleMobile, SHORTCUT_NAME, SHORTCUT_INSTALL_URL } from '../lib/shortcutSync'

const G = '#00FF88', Y = '#FFD60A', B = '#4D9EFF', P = '#BF5AF2', R = '#FF3B5C'

function Card({ children, style = {} }) {
  return <div style={{ background: 'rgba(18,18,26,0.90)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 16, padding: 20, border: '1px solid rgba(0,255,136,0.12)', boxShadow: '0 4px 24px rgba(0,0,0,0.6)', ...style }}>{children}</div>
}
function Label({ children }) {
  return <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>{children}</div>
}
const shortDate = iso => iso ? new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : ''

// ── History note ────────────────────────────────────────────────────────────
export function HistoryNote({ meta, onClear }) {
  const [confirm, setConfirm] = useState(false)
  if (!meta || !meta.uploadsCount) return null
  return (
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, padding: '0 4px' }}>
      📚 {meta.uploadsCount > 1
        ? <>Showing <b style={{ color: 'rgba(255,255,255,0.8)' }}>{meta.durationLabel}</b> of history from {meta.uploadsCount} uploads on this device — each new upload adds to it.</>
        : <>Saved on this device. Upload again anytime (even just the last 30 days) and your history keeps growing.</>}
      {' '}
      {!confirm
        ? <button onClick={() => setConfirm(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', textDecoration: 'underline', fontSize: 11, cursor: 'pointer', padding: 0 }}>Clear</button>
        : <span>Delete all health data saved in this browser?{' '}
            <button onClick={onClear} style={{ background: 'none', border: 'none', color: R, fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: 0 }}>Yes, clear</button>{' · '}
            <button onClick={() => setConfirm(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', padding: 0 }}>Cancel</button></span>}
    </div>
  )
}

// ── Streaks ─────────────────────────────────────────────────────────────────
export function StreaksCard({ streaks, asOf }) {
  const tiles = [
    streaks.sleep && { icon: '😴', label: '7h+ sleep', value: streaks.sleep.current, unit: streaks.sleep.current === 1 ? 'night' : 'nights', best: streaks.sleep.best, color: B },
    streaks.steps && { icon: '👟', label: `${(streaks.steps.goal / 1000)}k steps`, value: streaks.steps.current, unit: streaks.steps.current === 1 ? 'day' : 'days', best: streaks.steps.best, color: G },
    streaks.activeWeeks && { icon: '🏋️', label: '3+ workouts/wk', value: streaks.activeWeeks.current, unit: streaks.activeWeeks.current === 1 ? 'week' : 'weeks', best: streaks.activeWeeks.best, color: Y, note: `${streaks.activeWeeks.thisWeek}/3 this week` },
    streaks.meals && { icon: '🍽️', label: 'Meals logged', value: streaks.meals.current, unit: streaks.meals.current === 1 ? 'day' : 'days', best: streaks.meals.best, color: P },
  ].filter(Boolean)
  if (!tiles.length) return null
  return (
    <Card>
      <Label>🔥 Streaks{asOf ? ` · as of ${shortDate(asOf)}` : ''}</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
        {tiles.map(t => (
          <div key={t.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 12px 10px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>{t.icon} {t.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: t.value > 0 ? t.color : 'rgba(255,255,255,0.35)', lineHeight: 1 }}>{t.value}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{t.unit}</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 5 }}>
              {t.value > 0 && t.value >= t.best ? '🏆 Personal best' : `Best: ${t.best}`}{t.note ? ` · ${t.note}` : ''}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Daily check-in ──────────────────────────────────────────────────────────
export function CheckInCard({ hrvDaily, onChange }) {
  const [all, setAll] = useState(() => loadCheckins())
  const [which, setWhich] = useState(() => new Date().getHours() >= 18 ? 0 : -1)
  const day = localDay(which)
  const tags = all[day] || []
  const done = Object.prototype.hasOwnProperty.call(all, day)
  const toggle = id => {
    const next = tags.includes(id) ? tags.filter(t => t !== id) : [...tags, id]
    const updated = saveCheckin(day, next); setAll({ ...updated }); onChange && onChange(updated)
  }
  const markNothing = () => { const updated = saveCheckin(day, []); setAll({ ...updated }); onChange && onChange(updated) }
  const ins = computeCheckinInsights(all, hrvDaily || {})
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <Label>📝 10-second check-in</Label>
        <div style={{ display: 'flex', gap: 4, marginTop: -12 }}>
          {[[-1, 'Yesterday'], [0, 'Today']].map(([v, l]) => (
            <button key={v} onClick={() => setWhich(v)} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${which === v ? G : 'rgba(255,255,255,0.15)'}`, background: which === v ? 'rgba(0,255,136,0.15)' : 'transparent', color: which === v ? G : 'rgba(255,255,255,0.6)' }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>Anything {which === 0 ? 'today' : 'yesterday'} that could affect your recovery? Your watch can't see these.</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CHECKIN_TAGS.map(t => {
          const on = tags.includes(t.id)
          return <button key={t.id} onClick={() => toggle(t.id)} style={{ padding: '7px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', border: `1px solid ${on ? G : 'rgba(255,255,255,0.15)'}`, background: on ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)', color: on ? '#fff' : 'rgba(255,255,255,0.75)', fontWeight: on ? 700 : 500 }}>{t.icon} {t.label}</button>
        })}
        <button onClick={markNothing} style={{ padding: '7px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', border: `1px solid ${done && !tags.length ? G : 'rgba(255,255,255,0.15)'}`, background: done && !tags.length ? 'rgba(0,255,136,0.15)' : 'transparent', color: 'rgba(255,255,255,0.75)' }}>✓ None of these</button>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 12, lineHeight: 1.6 }}>
        {done ? '✅ Saved. ' : ''}
        {ins.items.length
          ? <>Biggest effect so far: <b style={{ color: ins.items[0].pct < 0 ? R : G }}>{ins.items[0].icon} {ins.items[0].label} {ins.items[0].pct > 0 ? '+' : ''}{ins.items[0].pct}% next-day HRV</b> — more in Habits.</>
          : ins.logged
            ? <>{ins.logged} day{ins.logged === 1 ? '' : 's'} logged. Insights appear once you've tagged something 3+ times and uploaded data covering those days.</>
            : <>Log a few days and VitaIQ will show which habits raise or lower your HRV.</>}
      </div>
    </Card>
  )
}

export function CheckinInsightsCard({ hrvDaily }) {
  const ins = computeCheckinInsights(loadCheckins(), hrvDaily || {})
  return (
    <Card>
      <Label>📝 Your check-ins vs next-day HRV</Label>
      {ins.items.length ? ins.items.map(it => (
        <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{it.icon} {it.label} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>· {it.n} days</span></div>
          <div style={{ fontSize: 13, fontWeight: 800, color: it.pct < 0 ? R : G }}>{it.pct > 0 ? '+' : ''}{it.pct}%</div>
        </div>
      )) : (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
          {ins.logged
            ? `${ins.logged} day${ins.logged === 1 ? '' : 's'} logged, ${ins.withHrv} with HRV data so far. Each habit needs 3+ tagged days covered by an upload.`
            : 'Use the 10-second check-in on the Today tab. After a couple of weeks you’ll see things like “late caffeine: −9% next-day HRV”.'}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 10 }}>Compared with your HRV on days you checked in without that tag. Patterns, not proof.</div>
    </Card>
  )
}

// ── Share my week ───────────────────────────────────────────────────────────
export function ShareWeekCard({ stats }) {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [blob, setBlob] = useState(null)
  const [msg, setMsg] = useState('')
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  if (!stats) return null
  const make = async () => {
    setBusy(true); setMsg('')
    try { const b = await drawWeekCard(stats); setBlob(b); setPreview(URL.createObjectURL(b)) }
    catch (e) { setMsg('Could not create the image on this browser.') }
    setBusy(false)
  }
  const share = async () => { const r = await shareOrDownload(blob); if (r === 'downloaded') setMsg('Saved to your downloads.') }
  return (
    <Card style={{ border: '1px solid rgba(191,90,242,0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>📤 Share my week</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>A story-sized card for Instagram, TikTok or WhatsApp</div>
        </div>
        <button onClick={make} disabled={busy} style={{ background: P, color: '#fff', border: 'none', borderRadius: 99, padding: '9px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{busy ? 'Making…' : 'Create card'}</button>
      </div>
      {preview && (
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <img src={preview} alt="My week card" style={{ width: '60%', maxWidth: 260, borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            <button onClick={share} style={{ background: G, color: '#000', border: 'none', borderRadius: 99, padding: '9px 18px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Share / Save</button>
            <button onClick={() => { setPreview(null); setBlob(null) }} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '9px 14px', fontSize: 12, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
      {msg && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 8, textAlign: 'center' }}>{msg}</div>}
    </Card>
  )
}

// ── Install as an app ───────────────────────────────────────────────────────
export function InstallHint() {
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem('vitaiq_install_hint') === 'x' } catch { return true } })
  const [prompt, setPrompt] = useState(() => window.__vitaiqInstallPrompt || null)
  useEffect(() => {
    const h = e => { e.preventDefault(); window.__vitaiqInstallPrompt = e; setPrompt(e) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  if (dismissed || standalone || (!ios && !prompt)) return null
  const close = () => { try { localStorage.setItem('vitaiq_install_hint', 'x') } catch {} ; setDismissed(true) }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 14, padding: '10px 12px' }}>
      <div style={{ fontSize: 22 }}>📲</div>
      <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
        <b style={{ color: '#fff' }}>Add VitaIQ to your Home Screen</b><br />
        {prompt ? 'Opens full-screen like an app.' : <>Tap <b>Share</b> <span style={{ fontSize: 14 }}>⎋</span> then <b>Add to Home Screen</b>.</>}
      </div>
      {prompt && <button onClick={async () => { prompt.prompt(); try { await prompt.userChoice } catch {} ; window.__vitaiqInstallPrompt = null; setPrompt(null); close() }} style={{ background: G, color: '#000', border: 'none', borderRadius: 99, padding: '7px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Install</button>}
      <button onClick={close} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 18, cursor: 'pointer', padding: 4 }}>×</button>
    </div>
  )
}

// ── Sync from iPhone (Apple Shortcut) ───────────────────────────────────────
// The period is chosen in the shortcut's own "How many days?" prompt, so the card just opens it.
export function SyncFromIPhone({ compact = false }) {
  const ios = isAppleMobile()
  return (
    <Card style={compact ? { padding: 16 } : {}}>
      <Label>📲 Sync from iPhone</Label>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 12 }}>
        Pull your latest Apple Health data straight in — no export app, no ZIP. Each sync adds to your history.
      </div>
      {ios
        ? <a href={shortcutRunUrl()} style={{ display: 'block', textAlign: 'center', background: G, color: '#000', borderRadius: 12, padding: '12px 16px', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>Sync from iPhone</a>
        : <><button onClick={openPairing} style={{ display: 'block', width: '100%', textAlign: 'center', background: G, color: '#000', border: 'none', borderRadius: 12, padding: '12px 16px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>📷 Bring data from my iPhone</button>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 8, lineHeight: 1.6 }}>Shows a QR code — scan it with your iPhone camera to see your latest synced data on this screen.</div></>}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 10, lineHeight: 1.6 }}>
        When the shortcut asks <b style={{ color: 'rgba(255,255,255,0.75)' }}>How many days?</b> type: <b style={{ color: 'rgba(255,255,255,0.75)' }}>7</b> quick top-up · <b style={{ color: 'rgba(255,255,255,0.75)' }}>30</b> recommended · <b style={{ color: 'rgba(255,255,255,0.75)' }}>90–180</b> longer history (can take a minute). Workout heart rate always covers the last 7 days, so sync weekly to keep every session.
      </div>
      {ios && <>
        <button onClick={openScanner} style={{ display: 'block', width: '100%', marginTop: 10, textAlign: 'center', background: 'transparent', color: G, border: '1px solid rgba(0,255,136,0.5)', borderRadius: 12, padding: '10px 14px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>💻 Send to computer</button>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6, lineHeight: 1.6 }}>
          <b style={{ color: 'rgba(255,255,255,0.75)' }}>Bigger screen?</b> Open vitalstats.netlify.app on your computer, tap <b style={{ color: 'rgba(255,255,255,0.75)' }}>View your iPhone data here</b>, then tap Send to computer here and scan its QR code.
        </div>
      </>}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6, lineHeight: 1.6 }}>
        {SHORTCUT_INSTALL_URL ? <>First time? <a href={SHORTCUT_INSTALL_URL} target="_blank" rel="noopener" style={{ color: G, fontWeight: 700 }}>Get the free “{SHORTCUT_NAME}” shortcut</a> (one tap, on your iPhone) · <a href="/shortcut.html" style={{ color: G }}>how it works</a>.</> : <>Needs the free “{SHORTCUT_NAME}” shortcut — <a href="/shortcut.html" style={{ color: G }}>setup guide</a>.</>}
      </div>
    </Card>
  )
}

// Banner shown while / after data arrives from the Shortcut
export function SyncToast({ status, onClose }) {
  if (!status) return null
  const color = status.state === 'error' ? R : G
  return (
    <div style={{ position: 'fixed', left: 16, right: 16, top: 'calc(env(safe-area-inset-top, 0px) + 12px)', zIndex: 1000, maxWidth: 480, margin: '0 auto', background: 'rgba(18,18,26,0.97)', border: `1px solid ${color}55`, borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <div style={{ fontSize: 18 }}>{status.state === 'busy' ? '⏳' : status.state === 'error' ? '⚠️' : '✅'}</div>
      <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
        <b style={{ color: '#fff' }}>{status.title}</b>{status.detail && <><br />{status.detail}</>}
      </div>
      {status.state !== 'busy' && <button onClick={onClose} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>}
    </div>
  )
}

// ── View on a computer (QR handoff) ─────────────────────────────────────────
// Computer shows a QR code → iPhone camera opens it → iPhone sends its data, end-to-end encrypted.
export const openPairing = () => window.dispatchEvent(new Event('vitaiq:pair'))

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'rgba(18,18,26,0.98)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 18, padding: 20, boxShadow: '0 12px 48px rgba(0,0,0,0.7)', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 22, cursor: 'pointer' }}>×</button>
        {children}
      </div>
    </div>
  )
}
const btn = (primary = true) => ({ display: 'block', width: '100%', textAlign: 'center', background: primary ? G : 'transparent', color: primary ? '#000' : 'rgba(255,255,255,0.7)', border: primary ? 'none' : '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '12px 16px', fontWeight: 800, fontSize: 14, cursor: 'pointer', textDecoration: 'none' })
const small = { fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }

function PairingModal({ onClose }) {
  const [pair, setPair] = useState(null)
  const [svg, setSvg] = useState('')
  const [state, setState] = useState('waiting') // waiting | done | error | expired
  const [err, setErr] = useState('')
  const [left, setLeft] = useState(600)
  const [n, setN] = useState(0) // bump for a new code
  useEffect(() => {
    let stop = false, timer
    ;(async () => {
      const [{ newPairing, pollOnce, applyPayload }, { default: qrcode }] = await Promise.all([import('../lib/handoff'), import('qrcode-generator')])
      const p = newPairing(); if (stop) return
      const qr = qrcode(0, 'M'); qr.addData(p.url); qr.make()
      setPair(p); setSvg(qr.createSvgTag({ cellSize: 5, margin: 3, scalable: true })); setState('waiting'); setErr('')
      const tick = async () => {
        if (stop) return
        const s = Math.max(0, Math.round((p.expiresAt - Date.now()) / 1000)); setLeft(s)
        if (s <= 0) { setState('expired'); return }
        try {
          const payload = await pollOnce(p)
          if (payload) {
            applyPayload(payload); setState('done')
            setTimeout(() => { history.replaceState(null, '', location.pathname); location.reload() }, 900)
            return
          }
        } catch (e) { if (/expired/i.test(e.message)) { setState('expired'); return } setErr(e.message) }
        timer = setTimeout(tick, 2000)
      }
      tick()
    })().catch(e => { setState('error'); setErr(e.message || String(e)) })
    return () => { stop = true; clearTimeout(timer) }
  }, [n])
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  return (
    <Modal onClose={onClose}>
      <Label>📷 View your iPhone data here</Label>
      {state === 'done'
        ? <div style={{ textAlign: 'center', padding: '24px 0' }}><div style={{ fontSize: 34 }}>✅</div><div style={{ fontWeight: 800, marginTop: 8 }}>Data received — opening your dashboard…</div></div>
        : state === 'expired'
          ? <div style={{ textAlign: 'center', padding: '16px 0' }}><div style={{ ...small, marginBottom: 14 }}>This code expired.</div><button onClick={() => setN(x => x + 1)} style={btn()}>Show a new code</button></div>
          : <>
            <div style={{ background: '#fff', borderRadius: 12, padding: 8, width: 220, height: 220, margin: '0 auto 14px' }} dangerouslySetInnerHTML={{ __html: svg }} />
            <ol style={{ ...small, color: 'rgba(255,255,255,0.7)', paddingLeft: 18, margin: '0 0 10px' }}>
              <li>On your iPhone, open VitaIQ where you see your dashboard (Safari or the Home Screen icon).</li>
              <li>On the Today tab tap <b style={{ color: '#fff' }}>💻 Send to computer</b> and point it at this code.</li>
              <li>Your dashboard appears here in a few seconds.</li>
            </ol>
            <div style={{ ...small, textAlign: 'center' }}>{pair ? <>Waiting for your iPhone… · code valid {mm}</> : 'Making a code…'}</div>
            {err && <div style={{ fontSize: 11, color: R, textAlign: 'center', marginTop: 6 }}>{err}</div>}
          </>}
      <div style={{ ...small, fontSize: 10.5, marginTop: 12, color: 'rgba(255,255,255,0.38)' }}>🔒 End-to-end encrypted: the key is only inside this QR code. Our server only passes on unreadable bytes once and deletes them on pickup (or after 10 minutes). This browser's VitaIQ data is replaced by your iPhone's.</div>
    </Modal>
  )
}

export const openScanner = () => window.dispatchEvent(new Event('vitaiq:scan'))

// iPhone: scan the computer's QR code from inside VitaIQ, so the data is sent from the
// same place the dashboard lives (Safari and Home Screen apps keep separate storage)
function ScanModal({ onFound, onClose }) {
  const [err, setErr] = useState('')
  useEffect(() => {
    let stream, raf, stop = false
    const video = document.getElementById('vitaiq-scan-video')
    ;(async () => {
      try {
        const [{ default: jsQR }, { parseSendHash }] = await Promise.all([import('jsqr'), import('../lib/handoff')])
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (stop) return
        video.srcObject = stream; await video.play()
        const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true })
        let last = 0
        const loop = t => {
          if (stop) return
          raf = requestAnimationFrame(loop)
          if (t - last < 150 || !video.videoWidth) return
          last = t
          const w = Math.min(720, video.videoWidth), h = Math.round(video.videoHeight * w / video.videoWidth)
          canvas.width = w; canvas.height = h; ctx.drawImage(video, 0, 0, w, h)
          const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
          if (!code) return
          let target = null
          try { target = parseSendHash(new URL(code.data).hash) } catch {}
          if (target) { stop = true; onFound(target) } else setErr("That's not a VitaIQ code. Point at the QR code on your computer.")
        }
        raf = requestAnimationFrame(loop)
      } catch (e) {
        setErr(e && e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera for this site (aA menu or Settings → Safari → Camera) and try again.' : `Couldn't start the camera: ${e.message || e}`)
      }
    })()
    return () => { stop = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()) }
  }, [])
  return (
    <Modal onClose={onClose}>
      <Label>💻 Send to computer</Label>
      <div style={{ ...small, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>On your computer open <b style={{ color: '#fff' }}>vitalstats.netlify.app</b> → <b style={{ color: '#fff' }}>View your iPhone data here</b>, then point this at the QR code.</div>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '1 / 1' }}>
        <video id="vitaiq-scan-video" playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: '18%', border: `2px solid ${G}`, borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
      </div>
      {err && <div style={{ fontSize: 11.5, color: R, marginTop: 10, lineHeight: 1.5 }}>{err}</div>}
      <button onClick={onClose} style={{ ...btn(false), marginTop: 12 }}>Cancel</button>
    </Modal>
  )
}

function SendModal({ target, onClose }) {
  const [state, setState] = useState('ask') // ask | busy | done | error | empty
  const [err, setErr] = useState('')
  useEffect(() => { import('../lib/handoff').then(m => { if (!m.hasLocalData()) setState('empty') }) }, [])
  const send = async () => {
    setState('busy')
    try { const m = await import('../lib/handoff'); await m.sendLocalData(target); setState('done') }
    catch (e) { setErr(e.message || String(e)); setState('error') }
  }
  return (
    <Modal onClose={onClose}>
      <Label>💻 Send to computer</Label>
      {state === 'done'
        ? <div style={{ textAlign: 'center', padding: '12px 0' }}><div style={{ fontSize: 34 }}>✅</div><div style={{ fontWeight: 800, margin: '8px 0 6px' }}>Sent</div><div style={small}>Your dashboard is opening on the computer. You can close this.</div><button onClick={onClose} style={{ ...btn(false), marginTop: 14 }}>Done</button></div>
        : state === 'empty'
          ? <>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: 10 }}>This browser has no VitaIQ data, so there's nothing to send from here.</div>
            <div style={{ ...small, color: 'rgba(255,255,255,0.65)', marginBottom: 14 }}>Open VitaIQ <b style={{ color: '#fff' }}>where you normally see your dashboard</b> (e.g. the VitaIQ icon on your Home Screen), tap <b style={{ color: '#fff' }}>💻 Send to computer</b> on the Today tab and point it at the code on your computer.</div>
            <button onClick={onClose} style={btn()}>OK</button>
          </>
          : <>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: 14 }}>Send your VitaIQ data from this iPhone to the computer that's showing the QR code? Only do this with a screen you're using yourself.</div>
            <button onClick={send} disabled={state === 'busy'} style={{ ...btn(), opacity: state === 'busy' ? 0.6 : 1 }}>{state === 'busy' ? 'Sending…' : 'Send to computer'}</button>
            <button onClick={onClose} style={{ ...btn(false), marginTop: 8 }}>Cancel</button>
            {err && <div style={{ fontSize: 11.5, color: R, marginTop: 10, lineHeight: 1.5 }}>{err}</div>}
            <div style={{ ...small, fontSize: 10.5, marginTop: 12, color: 'rgba(255,255,255,0.38)' }}>🔒 Encrypted on this phone; only that screen holds the key. Deleted from the relay on pickup or after 10 minutes.</div>
          </>}
    </Modal>
  )
}

// Mounted once in App: QR modal on the computer, "Send to computer" on the iPhone
export function HandoffLayer() {
  const [pairing, setPairing] = useState(false)
  const [target, setTarget] = useState(null)
  const [scanning, setScanning] = useState(false)
  useEffect(() => {
    const open = () => setPairing(true)
    const scan = () => setScanning(true)
    window.addEventListener('vitaiq:scan', scan)
    const check = async () => {
      if (!(location.hash || '').startsWith('#send=')) return
      const { parseSendHash } = await import('../lib/handoff')
      const t = parseSendHash(location.hash)
      history.replaceState(null, '', location.pathname + location.search) // keep the key out of history
      if (t) setTarget(t)
    }
    check()
    window.addEventListener('vitaiq:pair', open); window.addEventListener('hashchange', check)
    return () => { window.removeEventListener('vitaiq:pair', open); window.removeEventListener('vitaiq:scan', scan); window.removeEventListener('hashchange', check) }
  }, [])
  return <>
    {pairing && <PairingModal onClose={() => setPairing(false)} />}
    {scanning && <ScanModal onFound={t => { setScanning(false); setTarget(t) }} onClose={() => setScanning(false)} />}
    {target && <SendModal target={target} onClose={() => setTarget(null)} />}
  </>
}
