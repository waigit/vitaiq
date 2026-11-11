// VitaIQ — exercise sessions (tennis etc.) with the heart rate recorded during each one.
import { useState, useEffect, useRef, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { loadLabels, saveLabel, ZONES, zoneMinutes } from '../lib/sessions'

const G = '#00FF88', R = '#FF3B5C', MUTED = 'rgba(255,255,255,0.45)'
const QUICK_TAGS = ['Tennis', 'Running', 'Walking', 'Cycling', 'Strength', 'HIIT', 'Swimming', 'Badminton', 'Yoga']

function Card({ children, style = {} }) {
  return <div style={{ background: 'rgba(18,18,26,0.90)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 16, padding: 20, border: '1px solid rgba(0,255,136,0.12)', boxShadow: '0 4px 24px rgba(0,0,0,0.6)', ...style }}>{children}</div>
}
function Label({ children }) {
  return <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>{children}</div>
}
function Chart({ height, children }) {
  const ref = useRef(null)
  const [w, setW] = useState(() => Math.max(200, Math.min(typeof window !== 'undefined' ? window.innerWidth : 390, 960) - 68))
  useEffect(() => {
    const m = () => { const cw = ref.current?.clientWidth; if (cw > 0) setW(cw) }
    m(); const t = setTimeout(m, 60)
    window.addEventListener('resize', m)
    return () => { clearTimeout(t); window.removeEventListener('resize', m) }
  }, [])
  return <div ref={ref} style={{ width: '100%', overflow: 'hidden' }}><ResponsiveContainer width={w} height={height}>{children}</ResponsiveContainer></div>
}

const icon = type => {
  const t = (type || '').toLowerCase()
  if (t.includes('tennis') || t.includes('racquet') || t.includes('squash') || t.includes('pickle')) return '🎾'
  if (t.includes('badminton')) return '🏸'
  if (t.includes('run')) return '🏃'
  if (t.includes('walk') || t.includes('hik')) return '🚶'
  if (t.includes('cycl') || t.includes('bik')) return '🚴'
  if (t.includes('swim')) return '🏊'
  if (t.includes('strength') || t.includes('weight') || t.includes('functional')) return '🏋️'
  if (t.includes('yoga') || t.includes('pilates') || t.includes('flex')) return '🧘'
  if (t.includes('hiit') || t.includes('interval') || t.includes('cross')) return '🔥'
  if (t.includes('soccer') || t.includes('football')) return '⚽'
  if (t.includes('basket')) return '🏀'
  return '⌚'
}
const when = iso => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kuala_Lumpur' })
const clock = ms => new Date(ms).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kuala_Lumpur' })
const myDay = iso => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
const dur = m => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`

export function SessionsCard({ sessions = [], hrDiag = null }) {
  const [labels, setLabels] = useState(loadLabels)
  const [open, setOpen] = useState(null)
  const [tagging, setTagging] = useState(null)
  const [custom, setCustom] = useState('')
  const [shown, setShown] = useState(10)

  const list = useMemo(() => [...sessions].reverse().map(s => ({ ...s, label: s.type || labels[s.id] || null })), [sessions, labels])
  const maxHr = useMemo(() => Math.max(0, ...sessions.map(s => s.hr?.max || 0)) || null, [sessions])

  // Per-type summary for the last 30 days of data
  const summary = useMemo(() => {
    if (!list.length) return []
    const cut = new Date(new Date(list[0].start).getTime() - 30 * 864e5).toISOString()
    const by = {}
    for (const s of list) {
      if (s.start < cut) continue
      const k = s.label || 'Untagged'
      const b = by[k] || (by[k] = { n: 0, min: 0, hr: [] })
      b.n++; b.min += s.durationMin || 0; if (s.hr?.avg) b.hr.push(s.hr.avg)
    }
    return Object.entries(by).sort((a, b) => b[1].n - a[1].n)
  }, [list])

  const tag = (id, label) => { setLabels(saveLabel(id, label)); setTagging(null); setCustom('') }

  if (!sessions.length) {
    return (
      <Card>
        <Label>🎾 Sessions · heart rate</Label>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>No exercise sessions yet. To see each tennis match or workout with its heart-rate curve:</div>
        <ul style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, paddingLeft: 18, marginTop: 8 }}>
          <li><b style={{ color: '#fff' }}>iPhone Sync:</b> add a <b style={{ color: '#fff' }}>Heart Rate</b> block to your shortcut (<a href="/shortcut.html#heart-rate" style={{ color: G }}>how</a>). VitaIQ finds recorded workouts from the dense heart-rate readings your watch takes during them.</li>
          <li><b style={{ color: '#fff' }}>CSV ZIP:</b> tick <b style={{ color: '#fff' }}>Workouts</b> and <b style={{ color: '#fff' }}>Heart Rate</b> in Simple Health Export CSV. Sessions then arrive already named (e.g. Tennis).</li>
        </ul>
        {hrDiag && (
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,214,10,0.07)', border: '1px solid rgba(255,214,10,0.25)', fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            <b style={{ color: '#FFD60A' }}>Last sync's heart rate:</b> {hrDiag.raw} readings received, {hrDiag.parsed} with a readable time
            {hrDiag.first && <> ({myDay(hrDiag.first)} → {myDay(hrDiag.last)})</>} · typical gap {hrDiag.medianGapS ?? '–'}s · {hrDiag.shortGaps} gaps ≤60s · {hrDiag.withSpan} spans
            {hrDiag.parsed === 0 && hrDiag.sampleStart && <> · time looks like “{String(hrDiag.sampleStart).slice(0, 40)}”: set the Start Date bubble to ISO 8601 with time</>}
            <div style={{ color: MUTED, marginTop: 4 }}>No session was found in these readings. Screenshot this box for the Engineer.</div>
          </div>
        )}
      </Card>
    )
  }

  return (
    <Card>
      <Label>🎾 Sessions · heart rate</Label>
      {summary.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {summary.map(([k, b]) => (
            <div key={k} style={{ padding: '8px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
              <span style={{ marginRight: 6 }}>{icon(k)}</span><b style={{ color: '#fff' }}>{k}</b> · {b.n}× · {dur(b.min)}
              {b.hr.length > 0 && <> · avg <b style={{ color: R }}>{Math.round(b.hr.reduce((a, c) => a + c, 0) / b.hr.length)}</b> bpm</>}
            </div>
          ))}
          <div style={{ fontSize: 10, color: MUTED, alignSelf: 'center' }}>last 30 days</div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {list.slice(0, shown).map(s => {
          const isOpen = open === s.id
          const zones = isOpen ? zoneMinutes(s.hr?.series, maxHr) : null
          const zTotal = zones ? zones.reduce((a, b) => a + b, 0) : 0
          const startMs = new Date(s.start).getTime()
          return (
            <div key={s.id} style={{ borderRadius: 12, background: isOpen ? 'rgba(0,255,136,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isOpen ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
              <button onClick={() => setOpen(isOpen ? null : s.id)} style={{ all: 'unset', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{icon(s.label)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.label ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                    {s.label || 'Exercise session'}
                    {!s.label && <span style={{ marginLeft: 8, fontSize: 10, color: G, fontWeight: 700 }}>TAP TO TAG</span>}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED }}>{when(s.start)} · {dur(s.durationMin)}</div>
                </div>
                {s.hr ? (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: R }}>♥ {s.hr.avg}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>max {s.hr.max}</div>
                  </div>
                ) : <div style={{ fontSize: 10, color: MUTED }}>no HR</div>}
              </button>

              {isOpen && (
                <div style={{ padding: '0 14px 14px' }}>
                  {s.hr?.series?.length > 2 ? (
                    <Chart height={170}>
                      <LineChart data={s.hr.series.map(([sec, bpm]) => ({ t: sec, bpm }))} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="t" type="number" domain={[0, 'dataMax']} tickFormatter={v => `${Math.round(v / 60)}′`} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
                        <Tooltip contentStyle={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                          labelFormatter={v => `${clock(startMs + v * 1000)} · ${Math.round(v / 60)} min in`} formatter={v => [`${v} bpm`, 'Heart rate']} />
                        <ReferenceLine y={s.hr.avg} stroke="rgba(255,255,255,0.3)" strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="bpm" stroke={R} strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </Chart>
                  ) : <div style={{ fontSize: 12, color: MUTED, padding: '8px 0' }}>No heart-rate readings were synced for this session.</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(80px,1fr))', gap: 8, marginTop: 10 }}>
                    {[
                      ['Avg HR', s.hr ? `${s.hr.avg} bpm` : '–', R],
                      ['Max HR', s.hr ? `${s.hr.max} bpm` : '–', R],
                      ['Min HR', s.hr ? `${s.hr.min} bpm` : '–', '#fff'],
                      ['Duration', dur(s.durationMin), '#fff'],
                      s.calories != null && ['Active kcal', Math.round(s.calories), '#FFD60A'],
                    ].filter(Boolean).map(([k, v, c]) => (
                      <div key={k} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 10, color: MUTED }}>{k}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {zones && zTotal > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                        {zones.map((m, i) => m > 0 && <div key={i} style={{ width: `${m / zTotal * 100}%`, background: ZONES[i].color }} />)}
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                        {zones.map((m, i) => <span key={i}><span style={{ color: ZONES[i].color }}>●</span> {ZONES[i].name} {m}m</span>)}
                      </div>
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>Zones are % of the highest heart rate VitaIQ has seen in your sessions ({maxHr} bpm). That's an approximation of your true max, not a lab test.</div>
                    </div>
                  )}

                  {s.source === 'detected' && (
                    <div style={{ marginTop: 12 }}>
                      {tagging === s.id ? (
                        <>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {QUICK_TAGS.map(t => (
                              <button key={t} onClick={() => tag(s.id, t)} style={{ padding: '6px 10px', borderRadius: 99, border: `1px solid ${labels[s.id] === t ? G : 'rgba(255,255,255,0.15)'}`, background: labels[s.id] === t ? 'rgba(0,255,136,0.12)' : 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer' }}>{icon(t)} {t}</button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <input value={custom} onChange={e => setCustom(e.target.value)} maxLength={30} placeholder="Other…" style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13 }} />
                            <button onClick={() => custom.trim() && tag(s.id, custom.trim())} style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: G, color: '#000', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Save</button>
                            {labels[s.id] && <button onClick={() => tag(s.id, null)} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: MUTED, fontSize: 12, cursor: 'pointer' }}>Clear</button>}
                          </div>
                        </>
                      ) : (
                        <button onClick={() => setTagging(s.id)} style={{ padding: '7px 12px', borderRadius: 99, border: `1px solid ${G}`, background: 'transparent', color: G, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          {s.label ? `✎ Change tag (${s.label})` : '🏷 Tag this session'}
                        </button>
                      )}
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>Found from your watch's workout-mode heart-rate readings. Tags are saved on this device.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {list.length > shown && (
        <button onClick={() => setShown(shown + 10)} style={{ marginTop: 10, width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer' }}>Show more ({list.length - shown})</button>
      )}
    </Card>
  )
}
