
// VitaIQ — Supabase client (anon/publishable key; RLS policies are open by design — no login system)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = "https://egratofeiwsgickbjyss.supabase.co",
  SUPABASE_KEY = "sb_publishable_9wFc1lA7zJHD-wfoSW5nuA_0_l_m6tl",
  _client = createClient(SUPABASE_URL, SUPABASE_KEY);
export const supabase = _client;

export async function getFingerprint() {
  const e = localStorage.getItem("vitaiq_fp");
  if (e) return e;
  const t = [navigator.userAgent, navigator.language, screen.width + "x" + screen.height, screen.colorDepth, new Date().getTimezoneOffset(), navigator.hardwareConcurrency || "", navigator.platform || ""].join("|"),
    n = new TextEncoder().encode(t),
    i = await crypto.subtle.digest("SHA-256", n),
    a = Array.from(new Uint8Array(i)).map(l => l.toString(16).padStart(2, "0")).join("").slice(0, 32);
  return localStorage.setItem("vitaiq_fp", a), a;
}

export async function getOrCreateUser() {
  const e = await getFingerprint(),
    {
      data: t
    } = await supabase.from("vitaiq_users").select("*").eq("fingerprint", e).single();
  if (t) return await supabase.from("vitaiq_users").update({
    last_seen: new Date().toISOString()
  }).eq("fingerprint", e), t;
  const {
    data: r
  } = await supabase.from("vitaiq_users").insert({
    fingerprint: e
  }).select().single();
  return r;
}

export async function trackUpload(e) {
  const t = await getFingerprint();
  await supabase.from("vitaiq_uploads").insert({
    fingerprint: t,
    file_name: e.fileName || "",
    date_from: e.startDate || "",
    date_to: e.endDate || "",
    duration_days: e.durationDays || 0
  });
  const {
      data: r
    } = await supabase.from("vitaiq_users").select("upload_count").eq("fingerprint", t).single(),
    n = ((r == null ? undefined : r.upload_count) || 0) + 1;
  return await supabase.from("vitaiq_users").update({
    upload_count: n,
    last_seen: new Date().toISOString()
  }).eq("fingerprint", t), n;
}

export const FREE_UPLOAD_LIMIT = 5;

export async function getAffiliates() {
  const {
    data: e,
    error: t
  } = await supabase.from("vitaiq_affiliates").select("*").order("created_at", {
    ascending: false
  });
  return t ? (console.warn("getAffiliates:", t.message), []) : e || [];
}

let _affCache = null,
  _affCacheAt = 0;

export async function getAffiliatesCached(e = 60000) {
  const t = Date.now();
  if (_affCache && t - _affCacheAt < e) return _affCache;
  const r = await getAffiliates();
  return _affCache = r, _affCacheAt = t, r;
}

export function weightedAffiliateRotation(e, t = 3, r = 2) {
  if (!e || !e.length) return e || [];
  const n = e.slice(0, t),
    i = e.slice(t),
    o = [];
  return n.forEach(a => {
    for (let l = 0; l < r; l++) o.push(a);
  }), o.push(...i), o;
}

export async function addAffiliate(e) {
  const {
    data: t,
    error: r
  } = await supabase.from("vitaiq_affiliates").insert({
    name: e.name,
    commission: e.commission,
    url: e.url,
    icon: e.icon,
    color: e.color
  }).select().single();
  if (r) throw r;
  return _affCache = null, t;
}

export async function addAffiliatesBulk(e) {
  const {
    data: t,
    error: r
  } = await supabase.from("vitaiq_affiliates").insert(e.map(n => ({
    name: n.name,
    commission: n.commission,
    url: n.url,
    icon: n.icon,
    color: n.color
  }))).select();
  if (r) throw r;
  return _affCache = null, t || [];
}

export async function deleteAffiliate(e) {
  const {
    error: t
  } = await supabase.from("vitaiq_affiliates").delete().eq("id", e);
  if (t) throw t;
  _affCache = null;
}

export async function uploadMealPhoto(e) {
  try {
    const t = await getFingerprint(),
      r = await (await fetch(e)).blob(),
      n = `${t}/${Date.now()}.jpg`,
      {
        error: i
      } = await supabase.storage.from("nutrition-photos").upload(n, r, {
        contentType: "image/jpeg"
      });
    if (i) throw i;
    const {
      data: o
    } = supabase.storage.from("nutrition-photos").getPublicUrl(n);
    return {
      publicUrl: (o == null ? undefined : o.publicUrl) || null,
      path: n
    };
  } catch (t) {
    return console.warn("uploadMealPhoto failed:", t.message), {
      publicUrl: null,
      path: null
    };
  }
}

export async function saveNutritionLog(e) {
  const t = await getFingerprint(),
    {
      error: r
    } = await supabase.from("vitaiq_nutrition_logs").insert({
      fingerprint: t,
      log_date: e.logDate,
      items: e.items,
      totals: e.totals,
      photo_url: e.photoUrl || null,
      photo_path: e.photoPath || null
    });
  r && console.warn("saveNutritionLog failed:", r.message);
}

export async function cleanupOldNutritionPhotos(e = 30) {
  try {
    const t = await getFingerprint(),
      r = new Date();
    r.setDate(r.getDate() - e);
    const n = r.toISOString().slice(0, 10),
      {
        data: i,
        error: o
      } = await supabase.from("vitaiq_nutrition_logs").select("id, photo_path").eq("fingerprint", t).lt("log_date", n).not("photo_path", "is", null);
    if (o || !(i != null && i.length)) return;
    const a = i.map(l => l.photo_path).filter(Boolean);
    a.length && (await supabase.storage.from("nutrition-photos").remove(a)), await supabase.from("vitaiq_nutrition_logs").update({
      photo_url: null,
      photo_path: null
    }).in("id", i.map(l => l.id));
  } catch (t) {
    console.warn("cleanupOldNutritionPhotos failed:", t.message);
  }
}

export async function cleanupOldNutritionLogs(e = 365) {
  try {
    const t = await getFingerprint(),
      r = new Date();
    r.setDate(r.getDate() - e);
    const n = r.toISOString().slice(0, 10);
    await supabase.from("vitaiq_nutrition_logs").delete().eq("fingerprint", t).lt("log_date", n);
  } catch (t) {
    console.warn("cleanupOldNutritionLogs failed:", t.message);
  }
}

export async function getNutritionHistory(e = 30) {
  cleanupOldNutritionPhotos(30), cleanupOldNutritionLogs(365);
  try {
    const t = await getFingerprint(),
      r = new Date();
    r.setDate(r.getDate() - e);
    const n = r.toISOString().slice(0, 10),
      {
        data: i,
        error: o
      } = await supabase.from("vitaiq_nutrition_logs").select("*").eq("fingerprint", t).gte("log_date", n).order("log_date", {
        ascending: false
      });
    if (o) throw o;
    const a = {};
    for (const l of i || []) a[l.log_date] || (a[l.log_date] = []), a[l.log_date].push(l);
    return a;
  } catch (t) {
    return console.warn("getNutritionHistory failed:", t.message), {};
  }
}
