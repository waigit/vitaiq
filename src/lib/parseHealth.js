import { inflateRaw } from 'pako'

function readU16(e, t) {
  return e[t] | e[t + 1] << 8;
}

function readU32(e, t) {
  return (e[t] | e[t + 1] << 8 | e[t + 2] << 16 | e[t + 3] << 24) >>> 0;
}

function findEndOfCentralDir(e) {
  for (let t = e.length - 22; t >= 0; t--) if (e[t] === 80 && e[t + 1] === 75 && e[t + 2] === 5 && e[t + 3] === 6) return t;
  throw new Error("Not a valid ZIP");
}

function readZipDirectory(e) {
  const t = findEndOfCentralDir(e),
    r = readU32(e, t + 16),
    n = readU32(e, t + 12),
    i = new TextDecoder("utf-8"),
    o = {};
  let a = r;
  for (; a < r + n && e[a] === 80 && e[a + 1] === 75 && e[a + 2] === 1 && e[a + 3] === 2;) {
    const l = readU16(e, a + 10),
      s = readU32(e, a + 20),
      u = readU16(e, a + 28),
      f = readU16(e, a + 30),
      c = readU16(e, a + 32),
      p = readU32(e, a + 42),
      h = i.decode(e.slice(a + 46, a + 46 + u));
    o[h] = {
      lo: p,
      comp: l,
      cSz: s
    }, a += 46 + u + f + c;
  }
  return o;
}

function extractZipEntry(e, t) {
  const r = t.lo;
  if (!(e[r] === 80 && e[r + 1] === 75 && e[r + 2] === 3 && e[r + 3] === 4)) throw new Error("Bad local header");
  const n = readU16(e, r + 26),
    i = readU16(e, r + 28),
    o = r + 30 + n + i,
    a = e.slice(o, o + t.cSz),
    l = new TextDecoder("utf-8");
  if (t.comp === 0) return l.decode(a);
  if (t.comp === 8) return l.decode(inflateRaw(a));
  throw new Error(`Unsupported compression: ${t.comp}`);
}

function findZipEntry(e, t) {
  for (const [r, n] of Object.entries(e)) if (r.split("/").pop().includes(t)) return n;
  return null;
}

function findZipEntries(e, t) {
  const r = [];
  for (const [n, i] of Object.entries(e)) n.split("/").pop().includes(t) && r.push(i);
  return r;
}

function parseCSV(e) {
  const t = e.split(/\r?\n/).filter(i => i.trim());
  if (t.length < 2) return [];
  const r = t[0].startsWith("sep=") ? 1 : 0,
    n = t[r].split(",").map(i => i.replace(/"/g, "").trim());
  return t.slice(r + 1).map(i => {
    const o = [],
      {
        length: a
      } = i;
    let l = "",
      s = false;
    for (let f = 0; f < a; f++) {
      const c = i[f];
      c === '"' ? s = !s : c === "," && !s ? (o.push(l.trim()), l = "") : l += c;
    }
    o.push(l.trim());
    const u = {};
    return n.forEach((f, c) => u[f] = (o[c] || "").replace(/"/g, "")), u;
  }).filter(i => i.startDate && i.startDate.length > 5);
}

function parseAppleDate(e) {
  if (!e) return null;
  const t = String(e).trim(),
    r = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?\s*(?:([+-]\d{2}):?(\d{2})?)?/);
  if (!r) {
    const h = new Date(t);
    return isNaN(h.getTime()) ? null : h;
  }
  const [, n, i, o, a, l, s, u, f] = r;
  let c = Date.UTC(+n, +i - 1, +o, +a, +l, +(s || 0));
  if (u) {
    const h = u[0] === "-" ? -1 : 1,
      v = Math.abs(parseInt(u, 10)),
      w = parseInt(f || "0", 10);
    c -= h * (v * 60 + w) * 60000;
  }
  const p = new Date(c);
  return isNaN(p.getTime()) ? null : p;
}

function toMYT(e) {
  if (!e) return null;
  const t = parseAppleDate(e);
  return t ? new Date(t.getTime() + 8 * 3600000) : null;
}

function dayKey(e) {
  const t = toMYT(e);
  return t ? t.toISOString().slice(0, 10) : null;
}

function monthKey(e) {
  const t = toMYT(e);
  return t ? {
    label: `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][t.getUTCMonth()]}'${String(t.getUTCFullYear()).slice(2)}`,
    raw: `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`
  } : null;
}

function monthlyAverages(e, t = 1) {
  const r = {};
  return e.forEach(n => {
    const i = monthKey(n.startDate),
      o = parseFloat(n.value) * t;
    !i || isNaN(o) || (r[i.raw] || (r[i.raw] = {
      label: i.label,
      vals: []
    }), r[i.raw].vals.push(o));
  }), Object.entries(r).sort(([n], [i]) => n.localeCompare(i)).map(([n, {
    label: i,
    vals: o
  }]) => ({
    month: i,
    rawMonth: n,
    value: parseFloat((o.reduce((a, l) => a + l, 0) / o.length).toFixed(2))
  }));
}

export async function parseHealthZip(file) {
  var Mn, yi, za;
  const buffer = await file.arrayBuffer(),
    bytes = new Uint8Array(buffer),
    zipDir = readZipDirectory(bytes),
    out = {
      meta: {
        fileName: file.name,
        uploadedAt: new Date().toISOString()
      },
      latest: {},
      monthly: {},
      daily: {},
      sleep: {},
      alerts: []
    },
    readRows = N => {
      const B = findZipEntry(zipDir, N);
      if (!B) return [];
      try {
        return parseCSV(extractZipEntry(bytes, B));
      } catch (q) {
        return console.warn(`${N}:`, q), [];
      }
    },
    readRowsAll = N => {
      const B = findZipEntries(zipDir, N);
      let q = [];
      for (const re of B) try {
        q = q.concat(parseCSV(extractZipEntry(bytes, re)));
      } catch (ne) {
        console.warn(`${N}:`, ne);
      }
      return q;
    },
    sortByDate = N => [...N].sort((B, q) => B.startDate.localeCompare(q.startDate)),
    num = N => {
      const B = parseFloat(N);
      return isNaN(B) ? null : B;
    },
    values = N => N.map(B => num(B.value)).filter(B => B !== null),
    mean = N => N.length ? parseFloat((N.reduce((B, q) => B + q, 0) / N.length).toFixed(2)) : null,
    BASELINE_DAYS = 60,
    lastNDays = (N, B = BASELINE_DAYS) => {
      if (!N.length) return N;
      const q = toMYT(N[N.length - 1].startDate);
      if (!q) return N;
      const re = new Date(q.getTime() - B * 86400000);
      return N.filter(ne => {
        const oe = toMYT(ne.startDate);
        return oe && oe >= re;
      });
    },
    lastNDaysObj = (N, B = BASELINE_DAYS) => {
      const q = Object.keys(N).sort();
      if (!q.length) return N;
      const ne = new Date(new Date(q[q.length - 1] + "T00:00:00").getTime() - B * 86400000).toISOString().slice(0, 10),
        oe = {};
      return q.forEach(be => {
        be >= ne && (oe[be] = N[be]);
      }), oe;
    },
    SMOOTH_HOURS = 4,
    recentAvg = (N, B = SMOOTH_HOURS) => {
      if (!N.length) return null;
      const q = toMYT(N[N.length - 1].startDate),
        re = num(N[N.length - 1].value);
      if (!q) return re;
      const ne = new Date(q.getTime() - B * 3600000),
        oe = N.filter(be => {
          const Ut = toMYT(be.startDate);
          return Ut && Ut >= ne;
        }).map(be => num(be.value)).filter(be => be != null);
      return oe.length ? mean(oe) : re;
    };
  let sleepWindow = null;
  {
    const N = readRows("SleepAnalysis"),
      B = [],
      q = [];
    if (N.forEach(re => {
      const ne = (re.value || "").toLowerCase();
      if (ne.startsWith("asleep") || ne === "inbed") {
        const oe = toMYT(re.startDate),
          be = toMYT(re.endDate);
        oe && be && (B.push(oe), q.push(be));
      }
    }), B.length) {
      const re = new Date(Math.max(...q.map(be => be.getTime()))),
        ne = new Date(re.getTime() - 12 * 3600000),
        oe = B.filter(be => be >= ne);
      oe.length && (sleepWindow = {
        start: new Date(Math.min(...oe.map(be => be.getTime()))),
        end: re
      });
    }
  }
  const sleepWindowAvg = N => {
      if (!sleepWindow) return null;
      const B = N.filter(q => {
        const re = toMYT(q.startDate);
        return re && re >= sleepWindow.start && re <= sleepWindow.end;
      }).map(q => num(q.value)).filter(q => q != null);
      return B.length ? mean(B) : null;
    },
    rhrRows = sortByDate(readRows("RestingHeartRate"));
  if (rhrRows.length) {
    const N = values(rhrRows),
      B = sleepWindowAvg(rhrRows);
    out.latest.rhr = parseFloat((B ?? recentAvg(rhrRows) ?? N[N.length - 1]).toFixed(1)), out.latest.rhrSource = B != null ? "sleep" : "recent", out.latest.rhrAvg = mean(values(lastNDays(rhrRows))) || mean(N), out.monthly.rhr = monthlyAverages(rhrRows), out.meta.startDate = rhrRows[0].startDate.slice(0, 10), out.meta.endDate = rhrRows[rhrRows.length - 1].startDate.slice(0, 10);
  }
  const hrvRows = sortByDate(readRows("HeartRateVariabilitySDNN"));
  if (hrvRows.length) {
    const N = values(hrvRows),
      B = sleepWindowAvg(hrvRows);
    out.latest.hrv = parseFloat((B ?? recentAvg(hrvRows) ?? N[N.length - 1]).toFixed(1)), out.latest.hrvSource = B != null ? "sleep" : "recent", out.latest.hrvBaseline = mean(values(lastNDays(hrvRows))) || mean(N) || 35, out.monthly.hrv = monthlyAverages(hrvRows);
    const q = {};
    hrvRows.forEach(re => {
      const ne = dayKey(re.startDate),
        oe = num(re.value);
      ne && oe && (q[ne] || (q[ne] = []), q[ne].push(oe));
    }), out.daily.hrv = Object.fromEntries(Object.entries(q).map(([re, ne]) => [re, parseFloat(mean(ne).toFixed(1))]));
  }
  const spo2Rows = readRows("OxygenSaturation");
  if (spo2Rows.length) {
    const N = spo2Rows.map(B => num(B.value)).filter(B => B !== null).map(B => B * 100);
    N.length && (out.latest.spo2 = parseFloat(N[N.length - 1].toFixed(1)), out.latest.spo2Avg = parseFloat(mean(N).toFixed(1)), out.latest.spo2DipsBelow90 = N.filter(B => B < 90).length, out.monthly.spo2 = monthlyAverages(spo2Rows, 100), out.latest.spo2DipsBelow90 > 5 && out.alerts.push({
      type: "warning",
      metric: "SpO2",
      message: `${out.latest.spo2DipsBelow90} readings below 90% SpO2 during sleep — discuss with doctor`
    }));
  }
  const vo2Rows = sortByDate(readRows("VO2Max"));
  if (vo2Rows.length) {
    const N = values(vo2Rows);
    out.latest.vo2 = N.length ? parseFloat(N[N.length - 1].toFixed(2)) : null, out.latest.vo2Max = N.length ? parseFloat(Math.max(...N).toFixed(2)) : null, out.monthly.vo2 = monthlyAverages(vo2Rows);
  }
  const rrRows = sortByDate(readRows("RespiratoryRate"));
  if (rrRows.length) {
    const N = values(rrRows);
    out.latest.rr = N.length ? parseFloat(N[N.length - 1].toFixed(1)) : null, out.latest.rrAvg = mean(N), out.monthly.rr = monthlyAverages(rrRows);
  }
  const wristRows = sortByDate(readRows("AppleSleepingWristTemperature"));
  if (wristRows.length) {
    const N = values(wristRows);
    out.latest.wristTemp = N.length ? parseFloat(N[N.length - 1].toFixed(2)) : null, out.latest.wristTempBaseline = mean(N);
    const B = {};
    wristRows.forEach(q => {
      const re = dayKey(q.startDate),
        ne = num(q.value);
      re && ne && (B[re] = parseFloat(ne.toFixed(2)));
    }), out.daily.wristTemp = B;
  }
  const weightRows = sortByDate(readRows("BodyMass"));
  if (weightRows.length) {
    const N = values(weightRows);
    out.latest.weight = N.length ? parseFloat(N[N.length - 1].toFixed(1)) : null;
  }
  const sleepRows = readRows("SleepAnalysis"),
    sleepByDate = {},
    sleepBounds = {};
  sleepRows.forEach(N => {
    const B = toMYT(N.startDate),
      q = toMYT(N.endDate);
    if (!B || !q) return;
    const re = (q - B) / 3600000,
      ne = q.toISOString().slice(0, 10),
      oe = N.value || "";
    sleepByDate[ne] || (sleepByDate[ne] = {}), sleepByDate[ne][oe] = (sleepByDate[ne][oe] || 0) + re;
    const be = oe.toLowerCase();
    (be.startsWith("asleep") || be === "inbed") && (sleepBounds[ne] || (sleepBounds[ne] = {
      starts: [],
      ends: []
    }), sleepBounds[ne].starts.push(B), sleepBounds[ne].ends.push(q));
  }), Object.entries(sleepByDate).forEach(([N, B]) => {
    const q = (B.asleepCore || 0) + (B.asleep || 0),
      re = B.asleepDeep || 0,
      ne = B.asleepREM || 0,
      oe = B.awake || 0,
      be = B.inBed || B.InBed || B.inbed || 0,
      an = q + re + ne + oe > 12 ? 2 : 1,
      gi = (q + re + ne) / an;
    out.sleep[N] = {
      total: parseFloat(gi.toFixed(1)),
      deep: parseFloat((re / an).toFixed(1)),
      rem: parseFloat((ne / an).toFixed(1)),
      core: parseFloat((q / an).toFixed(1)),
      awake: parseFloat((oe / an).toFixed(1))
    }, be > 0 && (out.sleep[N].efficiency = parseFloat(Math.min(100, gi / (be / an) * 100).toFixed(1)));
  });
  const stdDev = N => {
      if (!N.length) return 0;
      const B = N.reduce((q, re) => q + re, 0) / N.length;
      return Math.sqrt(N.reduce((q, re) => q + (re - B) ** 2, 0) / N.length);
    },
    sleepTimes = Object.entries(sleepBounds).map(([N, B]) => {
      const q = new Date(Math.min(...B.starts.map(be => be.getTime()))),
        re = new Date(Math.max(...B.ends.map(be => be.getTime())));
      // getUTC* because toMYT() already shifted to Malaysia time (getHours() would add the browser's +8h again)
      let ne = q.getUTCHours() + q.getUTCMinutes() / 60;
      ne < 12 && (ne += 24);
      const oe = re.getUTCHours() + re.getUTCMinutes() / 60;
      // Morning wake time = end of the last sleep segment before noon.
      // wakeHour above also counts afternoon naps, so it's kept only for the
      // consistency score; the bedtime suggestion uses mainWakeHour.
      // (toMYT() dates carry Malaysia clock time in their UTC fields.)
      const morningEnds = B.ends.filter(be => be.getUTCHours() < 12),
        mw = morningEnds.length ? new Date(Math.max(...morningEnds.map(be => be.getTime()))) : null;
      return {
        night: N,
        bedHour: ne,
        wakeHour: oe,
        mainWakeHour: mw ? mw.getUTCHours() + mw.getUTCMinutes() / 60 : null
      };
    }).sort((N, B) => N.night.localeCompare(B.night)),
    last14 = sleepTimes.slice(-14);
  if (last14.length >= 3) {
    const N = stdDev(last14.map(q => q.bedHour)),
      B = stdDev(last14.map(q => q.mainWakeHour ?? q.wakeHour)); // naps excluded — they made every score 0
    out.latest.sleepConsistency = Math.round(Math.max(0, 100 - (N + B) / 2 * 50));
  }
  const efficiencies = Object.values(out.sleep).map(N => N.efficiency).filter(N => N != null);
  efficiencies.length && (out.latest.sleepEfficiency = Math.round(mean(efficiencies))), out.sleepTimes = sleepTimes;
  const stepRows = readRows("StepCount"),
    stepsByDay = {};
  stepRows.forEach(N => {
    const B = dayKey(N.startDate),
      q = num(N.value);
    B && q && (stepsByDay[B] = (stepsByDay[B] || 0) + q);
  }), out.daily.steps = Object.fromEntries(Object.entries(stepsByDay).map(([N, B]) => [N, Math.round(B)]));
  const activeRows = readRows("ActiveEnergyBurned"),
    activeByDay = {};
  activeRows.forEach(N => {
    const B = dayKey(N.startDate),
      q = num(N.value);
    B && q && (activeByDay[B] = (activeByDay[B] || 0) + q);
  });
  const exerciseRows = readRows("AppleExerciseTime"),
    exerciseByDay = {};
  exerciseRows.forEach(N => {
    const B = dayKey(N.startDate),
      q = num(N.value);
    B && q && (exerciseByDay[B] = (exerciseByDay[B] || 0) + q);
  });
  const basalRows = readRows("BasalEnergyBurned"),
    basalByDay = {};
  basalRows.forEach(N => {
    const B = dayKey(N.startDate),
      q = num(N.value);
    B && q && (basalByDay[B] = (basalByDay[B] || 0) + q);
  });
  const hrvNow = out.latest.hrv || 35,
    hrvBase = out.latest.hrvBaseline || 35,
    rhrNow = out.latest.rhr || 65,
    spo2Now = out.latest.spo2 || 96,
    hrvScore = Math.min(100, hrvNow / hrvBase * 60),
    rhrScore = Math.max(0, 100 - (rhrNow - 40) * 2),
    spo2Score = Math.min(100, (spo2Now - 88) * 8);
  out.latest.readiness = Math.min(99, Math.max(10, Math.round(hrvScore * 0.5 + rhrScore * 0.3 + spo2Score * 0.2)));
  const rhrBase = out.latest.rhrAvg || rhrNow,
    hrvStress = Math.min(100, Math.max(0, (1 - hrvNow / hrvBase) * 150)),
    rhrStress = Math.min(100, Math.max(0, (rhrNow - rhrBase) * 5));
  out.latest.stressIndex = Math.round(hrvStress * 0.65 + rhrStress * 0.35), out.latest.stressLabel = out.latest.stressIndex >= 67 ? "High" : out.latest.stressIndex >= 34 ? "Moderate" : "Low", out.latest.stress = out.latest.stressIndex;
  const activeDays = Object.keys(activeByDay),
    activeAvg = mean(Object.values(lastNDaysObj(activeByDay))) || mean(Object.values(activeByDay)),
    exerciseAvg = mean(Object.values(lastNDaysObj(exerciseByDay))) || mean(Object.values(exerciseByDay));
  if (activeDays.length && activeAvg) {
    const N = {};
    activeDays.forEach(re => {
      const ne = activeByDay[re] / activeAvg,
        oe = exerciseAvg ? (exerciseByDay[re] || 0) / exerciseAvg : ne;
      N[re] = parseFloat(Math.min(21, Math.max(0, (ne * 0.6 + oe * 0.4) * 10)).toFixed(1));
    }), out.daily.strain = N;
    const B = Object.keys(N).sort(),
      q = B.slice(-14);
    out.latest.strain = N[B[B.length - 1]] ?? null, out.latest.strainAvg = mean(q.map(re => N[re]));
  }
  {
    const N = re => {
        const ne = Object.keys(re).sort().slice(-7);
        return ne.length ? mean(ne.map(oe => re[oe])) : null;
      },
      B = N(activeByDay),
      q = N(basalByDay);
    B != null && q != null ? (out.latest.calorieGoal = Math.round(q + B), out.latest.calorieGoalSource = "watch") : B != null && out.latest.weight && (out.latest.calorieGoal = Math.round(out.latest.weight * 22 + B), out.latest.calorieGoalSource = "weight");
  }
  if ((Mn = out.monthly.hrv) != null && Mn.length && (yi = out.monthly.rhr) != null && yi.length) {
    const N = Object.fromEntries(out.monthly.rhr.map(B => [B.rawMonth, B.value]));
    out.monthly.readiness = out.monthly.hrv.map(B => ({
      month: B.month,
      rawMonth: B.rawMonth,
      value: Math.min(99, Math.max(10, Math.round(Math.min(100, B.value / hrvBase * 60) * 0.6 + Math.max(0, 100 - ((N[B.rawMonth] || 65) - 40) * 2) * 0.4)))
    })), out.monthly.stress = out.monthly.hrv.map(B => {
      const q = Math.min(100, Math.max(0, (1 - B.value / hrvBase) * 150)),
        re = Math.min(100, Math.max(0, ((N[B.rawMonth] || rhrBase) - rhrBase) * 5));
      return {
        month: B.month,
        rawMonth: B.rawMonth,
        value: Math.round(q * 0.65 + re * 0.35)
      };
    });
  }
  const workouts = readRowsAll("WorkoutActivityType").map(N => {
    const B = dayKey(N.startDate);
    if (!B) return null;
    let q = (N.activityType || "Workout").toString().trim();
    q = q.replace(/^HKWorkoutActivityType/, ""), q = q.replace(/([a-z0-9])([A-Z])/g, "$1 $2"), q || (q = "Workout");
    const re = num(N.duration),
      ne = re != null ? parseFloat((re / 60).toFixed(1)) : null;
    return {
      date: B,
      type: q,
      durationMin: ne,
      calories: num(N.totalEnergyBurned)
    };
  }).filter(Boolean);
  out.workouts = workouts;
  const hrvDaily = out.daily.hrv || {},
    hrvMean = mean(Object.values(hrvDaily)),
    nextDay = N => {
      const B = new Date(N + "T00:00:00");
      return B.setDate(B.getDate() + 1), dayKey(B.toISOString());
    },
    pctVsMean = N => hrvMean ? Math.round((N - hrvMean) / hrvMean * 100) : null,
    insights = [];
  if (hrvMean && workouts.length) {
    const N = {};
    workouts.forEach(B => {
      N[B.type] = (N[B.type] || 0) + 1;
    }), out.workoutTypeCounts = N, Object.entries(N).sort((B, q) => q[1] - B[1]).slice(0, 6).forEach(([B, q]) => {
      const re = workouts.filter(oe => oe.type === B).map(oe => oe.date),
        ne = [...new Set(re)].map(oe => hrvDaily[nextDay(oe)]).filter(oe => oe != null);
      if (ne.length >= 2) {
        const oe = pctVsMean(mean(ne));
        insights.push({
          h: `${B} — ${q}× this period`,
          e: `${oe >= 0 ? "+" : ""}${oe}% next-day HRV`,
          pos: oe >= 0,
          n: ne.length
        });
      } else insights.push({
        h: `${B} — ${q}× this period`,
        e: "Not enough repeats yet",
        pos: true,
        neutral: true
      });
    });
  }
  if (hrvMean && ((za = out.sleepTimes) == null ? undefined : za.length) >= 5) {
    const N = out.sleepTimes.filter(oe => oe.bedHour >= 24),
      B = out.sleepTimes.filter(oe => oe.bedHour < 24),
      q = oe => {
        const be = oe.map(Ut => hrvDaily[nextDay(Ut.night)]).filter(Ut => Ut != null);
        return be.length >= 2 ? pctVsMean(mean(be)) : null;
      },
      re = q(N),
      ne = q(B);
    ne != null && insights.push({
      h: `Asleep before midnight (${B.length} nights)`,
      e: `${ne >= 0 ? "+" : ""}${ne}% next-day HRV`,
      pos: ne >= 0
    }), re != null && insights.push({
      h: `Asleep after midnight (${N.length} nights)`,
      e: `${re >= 0 ? "+" : ""}${re}% next-day HRV`,
      pos: re >= 0
    });
  }
  if (hrvMean) {
    const N = Object.entries(out.sleep).filter(([, B]) => B.total < 5).map(([B]) => B);
    if (N.length >= 2) {
      const B = N.map(q => hrvDaily[nextDay(q)]).filter(q => q != null);
      if (B.length >= 2) {
        const q = pctVsMean(mean(B));
        insights.push({
          h: `Under 5hrs sleep (${N.length} nights)`,
          e: `${q >= 0 ? "+" : ""}${q}% next-day HRV`,
          pos: q >= 0
        });
      }
    }
  }
  if (out.habitInsights = insights, out.meta.startDate && out.meta.endDate) {
    const N = Math.round((new Date(out.meta.endDate) - new Date(out.meta.startDate)) / 86400000),
      B = Math.round(N / 30);
    out.meta.durationLabel = B >= 2 ? `${B} months` : N <= 1 ? "1 day" : `${N} days`, out.meta.durationMonths = B, out.meta.durationDays = N;
  }
  return out;
}
