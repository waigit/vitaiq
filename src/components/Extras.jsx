// VitaIQ — streaks, daily check-in, share card, install hint, history note.
import { useState, useEffect } from 'react'
import { CHECKIN_TAGS, loadCheckins, saveCheckin, localDay, computeCheckinInsights } from '../lib/insights'
import { drawWeekCard, shareOrDownload } from '../lib/shareCard'

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
