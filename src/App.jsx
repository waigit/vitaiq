import { useState, useEffect } from 'react'
import Landing from './components/Landing.jsx'
import Dashboard from './components/Dashboard.jsx'
import Admin from './components/Admin.jsx'
import { getOrCreateUser, FREE_UPLOAD_LIMIT } from './lib/supabase.js'
import { mergeUpload, clearHistory } from './lib/history.js'
import { buildFromSync, summarizeSync } from './lib/shortcutSync.js'
import { trackUpload } from './lib/supabase.js'
import { SyncToast, HandoffLayer } from './components/Extras.jsx'

function getSavedData() {
  try {
    const e = localStorage.getItem("vitaiq_health_data");
    return e ? JSON.parse(e) : null;
  } catch {
    return null;
  }
}

function saveData(e) {
  try {
    e ? localStorage.setItem("vitaiq_health_data", JSON.stringify(e)) : localStorage.removeItem("vitaiq_health_data");
  } catch (t) {
    console.warn("localStorage:", t);
  }
}

function App() {
  var O, b;
  const e = getSavedData(),
    [t, r] = useState(e ? "dashboard" : "landing"),
    [n, i] = useState(e),
    [o, a] = useState(0),
    [l, s] = useState(false),
    [u, f] = useState(() => localStorage.getItem("vitaiq_lang") || "EN"),
    [c, p] = useState(false),
    h = S => {
      f(S), localStorage.setItem("vitaiq_lang", S);
    };
  useEffect(() => {
    const S = "vitaiq";
    let j = "";
    const A = _ => {
      j += _.key.toLowerCase(), j.length > S.length && (j = j.slice(-S.length)), j === S && (j = "", r("admin"));
    };
    return window.addEventListener("keydown", A), () => window.removeEventListener("keydown", A);
  }, []), useEffect(() => {
    async function S() {
      try {
        const j = await getOrCreateUser();
        j && a(j.upload_count || 0);
      } catch {}
    }
    S();
  }, []);
  // Data sent by the "VitaIQ Sync" Apple Shortcut arrives as #sync=... (the part after # never leaves the browser)
  const [syncStatus, setSyncStatus] = useState(null);
  useEffect(() => {
    const check = () => {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#sync=")) return;
    const raw = hash.slice(6);
    history.replaceState(null, "", window.location.pathname + window.location.search); // don't leave health data in the URL
    setSyncStatus({ state: "busy", title: "Syncing from iPhone…" });
    setTimeout(async () => {
      try {
        const { data, counts } = buildFromSync(raw);
        let count;
        try { count = await trackUpload(data.meta || {}); } catch {}
        v(data, count);
        const nDays = data.meta.startDate && data.meta.endDate ? Math.round((new Date(data.meta.endDate) - new Date(data.meta.startDate)) / 864e5) + 1 : null;
        setSyncStatus({ state: "ok", title: `Synced ${nDays ? (nDays < 60 ? `${nDays} day${nDays > 1 ? "s" : ""}` : `${Math.round(nDays / 30)} months`) : "your data"} from iPhone`, detail: summarizeSync(data, counts) });
        setTimeout(() => setSyncStatus(s => s && s.state === "ok" ? null : s), 6000);
      } catch (err) {
        console.error("Sync failed:", err);
        setSyncStatus({ state: "error", title: "Sync didn't work", detail: err.message || String(err) });
      }
    }, 50);
    };
    check();
    window.addEventListener("hashchange", check); // Safari may reuse an open VitaIQ tab
    return () => window.removeEventListener("hashchange", check);
  }, []);
  const v = (S, j) => {
      // Merge this upload into the history kept on this device, so trends keep growing
      let merged = S;
      try { merged = mergeUpload(S) } catch (err) { console.warn('history merge failed:', err) }
      saveData(merged), i(merged), j !== undefined && a(j), r("dashboard");
    },
    w = () => {
      r("dashboard");
    },
    x = () => {
      r("landing"), s(false), p(false);
    },
    g = () => {
      const S = getSavedData();
      S && i(S), p(false), r("dashboard");
    },
    y = () => {
      i(null), p(false), r("dashboard");
    },
    m = () => {
      i(null), p(true), r("dashboard");
    };
  const toast = <><SyncToast status={syncStatus} onClose={() => setSyncStatus(null)} /><HandoffLayer /></>;
  return <>{toast}{t === "admin" ? <Admin onBack={() => r("landing")} /> : t === "dashboard" ? <Dashboard healthData={n} uploadCount={o} freeLimit={FREE_UPLOAD_LIMIT} onBack={x} lang={u} onLangChange={h} nutritionOnly={c} initialTab={c ? "nutrition" : "today"} onClearHistory={() => { clearHistory(); saveData(null); i(null); r("landing"); }} /> : <Landing onUpload={v} onLimitReached={w} uploadCount={o} freeLimit={FREE_UPLOAD_LIMIT} onDemo={y} onNutritionOnly={m} onGoToDashboard={g} hasExistingData={!!getSavedData()} lastUploadedAt={(b = (O = getSavedData()) == null ? undefined : O.meta) == null ? undefined : b.uploadedAt} lang={u} onLangChange={h} />}</>;
}

export default App
