// VitaIQ — "My week" share image (1080×1920, Instagram/TikTok story size), drawn on a canvas.

const W = 1080, H = 1920
const GREEN = '#00FF88', YELLOW = '#FFD60A', RED = '#FF3B5C', BLUE = '#4D9EFF', PURPLE = '#BF5AF2'

function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
const zoneColor = r => r >= 67 ? GREEN : r >= 33 ? YELLOW : RED

export function weekVerdict(s) {
  if (s.readiness != null && s.readiness >= 67 && (s.avgSleep ?? 0) >= 7) return 'Recovered and ready. Big week ahead.'
  if (s.sleepDebt != null && s.sleepDebt >= 5) return 'Training hard, sleeping short. Bed earlier this week.'
  if (s.loadZone === 'Load spike') return 'Big jump in training. Ease in to stay injury-free.'
  if ((s.avgSleep ?? 0) >= 7) return 'Solid sleep week. Keep the rhythm.'
  if ((s.workoutDays ?? s.activeDays ?? 0) >= 4) return 'Active week — now match it with sleep.'
  return 'Small steps, every day.'
}

export async function drawWeekCard(s) {
  try { await document.fonts?.ready } catch {}
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')
  const font = (w, px) => `${w} ${px}px Inter, -apple-system, system-ui, sans-serif`

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#07070C'); bg.addColorStop(1, '#0E1A14')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W * 0.8, 260, 20, W * 0.8, 260, 700)
  glow.addColorStop(0, 'rgba(0,255,136,0.22)'); glow.addColorStop(1, 'rgba(0,255,136,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)

  // Brand
  rr(ctx, 80, 110, 76, 76, 20); ctx.fillStyle = GREEN; ctx.fill()
  ctx.fillStyle = '#000'; ctx.font = font(900, 40); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('V', 118, 150)
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fff'; ctx.font = font(900, 46); ctx.fillText('VitaIQ', 180, 160)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = font(600, 30); ctx.fillText('MY WEEK', 180, 200 - 8)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = font(600, 34); ctx.textAlign = 'right'
  ctx.fillText(`${fmtDate(s.from)} – ${fmtDate(s.to)}`, W - 80, 160); ctx.textAlign = 'left'

  // Readiness ring
  const cx = W / 2, cy = 560, R = 230, col = zoneColor(s.readiness ?? 50)
  ctx.lineWidth = 44; ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
  if (s.readiness != null) {
    ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 40
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (s.readiness / 100)); ctx.stroke(); ctx.shadowBlur = 0
  }
  ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.font = font(900, 170); ctx.fillText(s.readiness != null ? String(s.readiness) : '–', cx, cy + 55)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = font(700, 34); ctx.fillText('READINESS', cx, cy + 120)

  // Verdict
  ctx.fillStyle = '#fff'; ctx.font = font(800, 52)
  const verdict = weekVerdict(s), words = verdict.split(' '), lines = []
  let line = ''
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > W - 200) { lines.push(line); line = w } else line = t }
  lines.push(line)
  lines.forEach((l, i) => ctx.fillText(l, cx, 950 + i * 66))

  // Stat tiles (2×3)
  const tiles = [
    ['😴', 'Avg sleep', s.avgSleep != null ? `${s.avgSleep}h` : '–', BLUE],
    ['💤', 'Sleep debt', s.sleepDebt != null ? `${s.sleepDebt}h` : '–', s.sleepDebt >= 5 ? RED : s.sleepDebt >= 2 ? YELLOW : GREEN],
    s.workoutDays == null && s.activeDays != null
      ? ['🏃', 'Active days (30+ min)', `${s.activeDays}/7`, YELLOW]
      : ['🏋️', 'Workout days', s.workoutDays != null ? `${s.workoutDays}/7` : '–', YELLOW],
    ['👟', 'Avg steps', s.avgSteps != null ? s.avgSteps.toLocaleString('en-US') : '–', GREEN],
    ['📈', 'Training load', s.loadZone || '–', s.loadColor || PURPLE],
    ['💚', 'Avg HRV', s.avgHrv != null ? `${s.avgHrv} ms` : '–', GREEN],
  ]
  const tw = (W - 80 * 2 - 30) / 2, th = 170, top = 1110
  tiles.forEach(([icon, label, value, color], i) => {
    const x = 80 + (i % 2) * (tw + 30), y = top + Math.floor(i / 2) * (th + 26)
    rr(ctx, x, y, tw, th, 28); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.textAlign = 'left'; ctx.font = font(600, 30); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(`${icon}  ${label}`, x + 32, y + 58)
    ctx.font = font(900, value.length > 9 ? 46 : 60); ctx.fillStyle = color; ctx.fillText(value, x + 32, y + 132)
  })

  // Footer
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = font(600, 32)
  ctx.fillText('Free Apple Watch health dashboard', cx, H - 150)
  ctx.fillStyle = GREEN; ctx.font = font(800, 44); ctx.fillText('vitalstats.netlify.app', cx, H - 90)

  return new Promise(res => c.toBlob(b => res(b), 'image/png'))
}

// Share via the phone's share sheet when available, otherwise download the PNG.
export async function shareOrDownload(blob, filename = 'vitaiq-my-week.png') {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'My week on VitaIQ', text: 'My week on VitaIQ — vitalstats.netlify.app' }); return 'shared' }
    catch (e) { if (e && e.name === 'AbortError') return 'cancelled' }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'downloaded'
}
