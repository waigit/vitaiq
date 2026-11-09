import { useState, useEffect } from 'react'
import Landing from './components/Landing.jsx'
import Dashboard from './components/Dashboard.jsx'
import Admin from './components/Admin.jsx'
import { getOrCreateUser, FREE_UPLOAD_LIMIT } from './lib/supabase.js'
import { mergeUpload, clearHistory } from './lib/history.js'

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
  return t === "admin" ? <Admin onBack={() => r("landing")} /> : t === "dashboard" ? <Dashboard healthData={n} uploadCount={o} freeLimit={FREE_UPLOAD_LIMIT} onBack={x} lang={u} onLangChange={h} nutritionOnly={c} initialTab={c ? "nutrition" : "today"} onClearHistory={() => { clearHistory(); saveData(null); i(null); r("landing"); }} /> : <Landing onUpload={v} onLimitReached={w} uploadCount={o} freeLimit={FREE_UPLOAD_LIMIT} onDemo={y} onNutritionOnly={m} onGoToDashboard={g} hasExistingData={!!getSavedData()} lastUploadedAt={(b = (O = getSavedData()) == null ? undefined : O.meta) == null ? undefined : b.uploadedAt} lang={u} onLangChange={h} />;
}

export default App
