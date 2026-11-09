import { useState, useEffect } from 'react'
import { supabase, getAffiliates, addAffiliatesBulk, addAffiliate, deleteAffiliate } from '../lib/supabase'

const A = {
  bg: "#0A0A0F",
  surface: "#12121A",
  surface2: "#1A1A26",
  border: "rgba(255,255,255,0.08)",
  border2: "rgba(255,255,255,0.14)",
  accent: "#00FF88",
  accentBg: "rgba(0,255,136,0.10)",
  text: "#fff",
  muted: "rgba(255,255,255,0.45)",
  sub: "rgba(255,255,255,0.65)",
  yellow: "#FFD60A",
  red: "#FF3B5C",
  blue: "#4D9EFF",
  purple: "#BF5AF2"
};

function Card({
  children: e,
  style: t = {}
}) {
  return <div style={{
    background: A.surface,
    border: `1px solid ${A.border}`,
    borderRadius: 12,
    padding: 16,
    ...t
  }}>{e}</div>;
}

function Label({
  children: e
}) {
  return <div style={{
    fontSize: 9,
    color: A.muted,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: 600
  }}>{e}</div>;
}

function StatCard({
  icon: e,
  label: t,
  value: r,
  sub: n,
  color: i = "#00FF88"
}) {
  return <div style={{
    background: A.surface,
    border: `1px solid ${A.border}`,
    borderRadius: 12,
    padding: 16
  }}><div style={{
      fontSize: 20,
      marginBottom: 8
    }}>{e}</div><Label>{t}</Label><div style={{
      fontSize: 28,
      fontWeight: 700,
      color: i,
      lineHeight: 1,
      marginBottom: 4
    }}>{r}</div>{n && <div style={{
      fontSize: 11,
      color: A.muted
    }}>{n}</div>}</div>;
}

function iconForAffiliate(e) {
  const t = e.toLowerCase();
  return t.includes("snack") || t.includes("food") ? "🥗" : t.includes("female") || t.includes("women") ? "🩺" : t.includes("natural") || t.includes("life") ? "🌿" : t.includes("pharmacy") || t.includes("kk") ? "🏥" : t.includes("master") || t.includes("sport") || t.includes("workout") ? "💪" : t.includes("happy") || t.includes("health malaysia") ? "❤️" : t.includes("home") ? "🏠" : t.includes("supplement") ? "⚗️" : t.includes("vault") ? "🔒" : t.includes("bear") || t.includes("family") ? "🐻" : t.includes("beauty") ? "🌸" : "💊";
}

function colorForCommission(e) {
  const t = parseInt((e || "").replace(/\D/g, "")) || 0;
  return t >= 18 ? "#00FF88" : t >= 10 ? "#FFD60A" : t >= 5 ? "#4D9EFF" : "#BF5AF2";
}

function Admin({
  onBack: e
}) {
  const [t, r] = useState(false),
    [n, i] = useState(""),
    [o, a] = useState("overview"),
    [l, s] = useState([]),
    [u, f] = useState([]),
    c = [{
      icon: "🌿",
      name: "Health Natural Life",
      commission: "up to 24%",
      url: "https://s.shopee.com.my/3qLGjujtTt",
      color: "#00FF88"
    }, {
      icon: "💊",
      name: "Nova Health",
      commission: "up to 21%",
      url: "https://s.shopee.com.my/3B5ZwgmQpp",
      color: "#00FF88"
    }, {
      icon: "🏥",
      name: "Health Origins",
      commission: "up to 19%",
      url: "https://s.shopee.com.my/50XE83fS7E",
      color: "#00FF88"
    }, {
      icon: "💪",
      name: "Health Master MY",
      commission: "up to 16%",
      url: "https://s.shopee.com.my/1VxLxcsmDP",
      color: "#4D9EFF"
    }, {
      icon: "❤️",
      name: "HAPPY HEALTH MALAYSIA",
      commission: "up to 13%",
      url: "https://s.shopee.com.my/2qSjY4nhVn",
      color: "#FFD60A"
    }, {
      icon: "🩺",
      name: "Female Health",
      commission: "up to 13%",
      url: "https://s.shopee.com.my/40egwDjG98",
      color: "#FF3B5C"
    }, {
      icon: "🏠",
      name: "Health Home",
      commission: "up to 12%",
      url: "https://s.shopee.com.my/3g1qXbkWoq",
      color: "#4D9EFF"
    }, {
      icon: "🥗",
      name: "Healthy Snacks Malaysia",
      commission: "up to 11%",
      url: "https://s.shopee.com.my/4VaxX8hM8D",
      color: "#FFD60A"
    }, {
      icon: "⚗️",
      name: "Health Supplements Store MY",
      commission: "up to 9%",
      url: "https://s.shopee.com.my/1qaCMErVXR",
      color: "#BF5AF2"
    }, {
      icon: "🩻",
      name: "Health@Care",
      commission: "up to 9%",
      url: "https://s.shopee.com.my/4fuNjRginC",
      color: "#BF5AF2"
    }, {
      icon: "✨",
      name: "TY Healthy Store",
      commission: "up to 7%",
      url: "https://s.shopee.com.my/5AqeKMeomH",
      color: "#FFD60A"
    }, {
      icon: "🌺",
      name: "Health Freedom For All",
      commission: "up to 8%",
      url: "https://s.shopee.com.my/3ViQLIlA9r",
      color: "#00FF88"
    }, {
      icon: "🐻",
      name: "Little Bear Healthy Family",
      commission: "up to 8%",
      url: "https://s.shopee.com.my/30m9kNn4Am",
      color: "#FFD60A"
    }, {
      icon: "🌸",
      name: "Malaysia Anshenyue Healthcare",
      commission: "up to 9%",
      url: "https://s.shopee.com.my/2g9JLloKqk",
      color: "#BF5AF2"
    }, {
      icon: "💚",
      name: "healthylife85jn.my",
      commission: "up to 6%",
      url: "https://s.shopee.com.my/4LHXKphzTA",
      color: "#00FF88"
    }, {
      icon: "🏡",
      name: "aushealthwarehouseks.my",
      commission: "up to 6%",
      url: "https://s.shopee.com.my/4qDnvkg5SF",
      color: "#4D9EFF"
    }, {
      icon: "🏥",
      name: "dellabeauty and health",
      commission: "up to 8%",
      url: "https://s.shopee.com.my/3LP08zlnUo",
      color: "#FF3B5C"
    }, {
      icon: "💊",
      name: "SR Health & Beauty",
      commission: "up to 4%",
      url: "https://s.shopee.com.my/2BD2kqqErT",
      color: "#BF5AF2"
    }, {
      icon: "🔒",
      name: "HealthVault.my",
      commission: "up to 8%",
      url: "https://s.shopee.com.my/1LdvlJtPYM",
      color: "#4D9EFF"
    }, {
      icon: "💊",
      name: "KK Health Pharmacy",
      commission: "up to 1%",
      url: "https://s.shopee.com.my/1gGm9vs8sO",
      color: "#4D9EFF"
    }],
    [p, h] = useState([]),
    [v, w] = useState(true),
    [x, g] = useState({
      name: "",
      url: "",
      commission: "",
      icon: "",
      color: "#00FF88"
    }),
    [y, m] = useState(""),
    [O, b] = useState("manual"),
    [S, j] = useState([]),
    [A, _] = useState(""),
    [E, C] = useState("");
  useEffect(() => {
    C(new Date().toLocaleTimeString("en-MY"));
  }, []);
  async function k() {
    try {
      const {
          data: P
        } = await supabase.from("vitaiq_users").select("*").order("created_at", {
          ascending: false
        }).limit(50),
        {
          data: F
        } = await supabase.from("vitaiq_uploads").select("*").order("uploaded_at", {
          ascending: false
        }).limit(100);
      P && s(P), F && f(F), await L(), C(new Date().toLocaleTimeString("en-MY"));
    } catch (P) {
      console.error(P);
    }
  }
  async function L() {
    w(true);
    try {
      let P = await getAffiliates();
      if (P.length === 0) try {
        P = await addAffiliatesBulk(c);
      } catch (F) {
        console.warn("seed failed:", F.message);
      }
      h(P);
    } catch (P) {
      console.error("loadAffiliates:", P), m("Could not load from database — check Supabase connection");
    }
    w(false);
  }
  if (useEffect(() => {
    t && k();
  }, [t]), !t) return <div style={{
    minHeight: "100vh",
    background: A.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  }}><div style={{
      background: A.surface,
      border: `1px solid ${A.border}`,
      borderRadius: 16,
      padding: 28,
      maxWidth: 340,
      width: "100%",
      textAlign: "center"
    }}><div style={{
        fontSize: 28,
        marginBottom: 8
      }}>🔐</div><div style={{
        fontSize: 16,
        fontWeight: 700,
        color: A.text,
        marginBottom: 4
      }}>VitaIQ Admin</div><div style={{
        fontSize: 11,
        color: A.muted,
        marginBottom: 20
      }}>Private dashboard</div><input type="password" value={n} onChange={P => i(P.target.value)} onKeyDown={P => P.key === "Enter" && n === "vitaiq-admin-2026" && r(true)} placeholder="Enter password" style={{
        width: "100%",
        background: A.surface2,
        border: `1px solid ${A.border2}`,
        borderRadius: 8,
        padding: "10px 14px",
        color: A.text,
        fontSize: 13,
        marginBottom: 10,
        outline: "none"
      }} /><button onClick={() => n === "vitaiq-admin-2026" && r(true)} style={{
        width: "100%",
        background: A.accent,
        color: "#000",
        border: "none",
        borderRadius: 8,
        padding: "11px",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer"
      }}>Enter</button></div></div>;
  const D = P => ({
    padding: "7px 14px",
    borderRadius: 8,
    border: `1px solid ${o === P ? A.accent : A.border}`,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    background: o === P ? A.accentBg : A.surface2,
    color: o === P ? A.accent : A.sub,
    transition: "all 0.15s"
  });
  async function R() {
    if (!x.name || !x.url) {
      m("Name and URL required");
      return;
    }
    if (p.some(F => F.url === x.url)) {
      m("URL already exists");
      return;
    }
    const P = {
      ...x,
      icon: x.icon || iconForAffiliate(x.name),
      color: x.color || colorForCommission(x.commission)
    };
    try {
      const F = await addAffiliate(P);
      h(G => [F, ...G]), g({
        name: "",
        url: "",
        commission: "",
        icon: "",
        color: "#00FF88"
      }), m("✓ Added and saved"), setTimeout(() => m(""), 3000);
    } catch (F) {
      m("Save failed: " + F.message);
    }
  }
  function z(P) {
    const F = P.trim().split(`
`).map(de => de.trim()).filter(Boolean),
      G = F[0].split(",").map(de => de.replace(/^"|"$/g, "").trim()),
      U = G.findIndex(de => de.toLowerCase().includes("offer name")),
      J = G.findIndex(de => de.toLowerCase().includes("commission rate")),
      ce = G.findIndex(de => de.toLowerCase().includes("trackable link_short"));
    if (U < 0 || ce < 0) return {
      error: "Cannot find required columns (Offer Name, Commission Rate, Trackable Link_short)"
    };
    const Se = [];
    for (let de = 1; de < F.length; de++) {
      const Ze = [];
      let Ke = "",
        Q = false;
      for (const Ae of F[de]) Ae === '"' ? Q = !Q : Ae === "," && !Q ? (Ze.push(Ke.trim()), Ke = "") : Ke += Ae;
      Ze.push(Ke.trim());
      const se = (Ze[U] || "").replace(/^"|"$/g, "").trim(),
        le = (Ze[J] || "").replace(/^"|"$/g, "").trim(),
        K = (Ze[ce] || "").replace(/^"|"$/g, "").trim();
      !se || !K || Se.push({
        name: se,
        commission: le,
        url: K,
        icon: iconForAffiliate(se),
        color: colorForCommission(le),
        duplicate: p.some(Ae => Ae.url === K)
      });
    }
    return {
      rows: Se
    };
  }
  function W(P) {
    if (!P) return;
    const F = new FileReader();
    F.onload = G => {
      const U = z(G.target.result);
      if (U.error) {
        _(U.error);
        return;
      }
      j(U.rows.map(J => ({
        ...J,
        selected: !J.duplicate
      }))), _("");
    }, F.readAsText(P);
  }
  async function I() {
    const P = S.filter(U => U.selected);
    if (!P.length) {
      _("Select at least one row");
      return;
    }
    const F = new Set(p.map(U => U.url)),
      G = P.filter(U => !F.has(U.url));
    if (!G.length) {
      _("All selected rows already exist");
      return;
    }
    try {
      const U = await addAffiliatesBulk(G);
      h(J => [...U, ...J]), j([]), _(`✓ ${U.length} affiliate${U.length > 1 ? "s" : ""} imported and saved`), setTimeout(() => _(""), 4000);
    } catch (U) {
      _("Save failed: " + U.message);
    }
  }
  return <div style={{
    minHeight: "100vh",
    background: A.bg,
    color: A.text,
    fontFamily: "system-ui,sans-serif"
  }}><div style={{
      background: A.surface,
      borderBottom: `1px solid ${A.border}`,
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 50
    }}><div style={{
        display: "flex",
        alignItems: "center",
        gap: 10
      }}><button onClick={e} style={{
          background: "none",
          border: "none",
          color: A.muted,
          fontSize: 18,
          cursor: "pointer",
          padding: "0 8px 0 0"
        }}>←</button><div><div style={{
            fontSize: 15,
            fontWeight: 600,
            color: A.text
          }}>🔐 VitaIQ Admin</div><div style={{
            fontSize: 10,
            color: A.muted,
            textTransform: "uppercase",
            letterSpacing: 1
          }}>Private dashboard</div></div></div><div style={{
        display: "flex",
        gap: 8,
        alignItems: "center"
      }}><span style={{
          fontSize: 11,
          color: A.muted
        }}>{"Updated: "}{E}</span><button onClick={k} style={{
          background: A.accent,
          color: "#000",
          border: "none",
          borderRadius: 8,
          padding: "6px 14px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer"
        }}>⟳ Refresh</button></div></div><div style={{
      maxWidth: 1000,
      margin: "0 auto",
      padding: "20px 16px"
    }}><div style={{
        display: "flex",
        gap: 6,
        marginBottom: 20,
        flexWrap: "wrap"
      }}>{[["overview", "Overview"], ["affiliates", "Affiliate links"], ["users", "Users"], ["uploads", "Uploads"]].map(([P, F]) => <button key={P} onClick={() => a(P)} style={D(P)}>{F}</button>)}</div>{o === "overview" && <div><div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
          gap: 10,
          marginBottom: 16
        }}><StatCard icon="👥" label="Total users" value={l.length || "—"} sub={`${l.filter(P => {
            try {
              return new Date(P.created_at) > new Date(Date.now() - 86400000);
            } catch {
              return false;
            }
          }).length} new today`} color={A.blue} /><StatCard icon="📅" label="This week" value={l.filter(P => {
            try {
              return new Date(P.created_at) > new Date(Date.now() - 7 * 86400000);
            } catch {
              return false;
            }
          }).length || "—"} sub="new signups" color={A.accent} /><StatCard icon="📤" label="Total uploads" value={u.length || "—"} sub="health exports processed" color={A.yellow} /><StatCard icon="🔗" label="Affiliate links" value={p.length} sub="across 3 placements" color={A.purple} /></div><Card><Label>Recent activity</Label>{u.slice(0, 5).map((P, F) => <div key={F} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 0",
            borderBottom: `1px solid ${A.border}`
          }}><div><div style={{
                fontSize: 12,
                color: A.text
              }}>{"📤 Upload · "}<span style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: A.muted
                }}>{(P.device_id || "").slice(0, 8)}…</span></div><div style={{
                fontSize: 10,
                color: A.muted
              }}>{P.start_date}{" → "}{P.end_date}</div></div><div style={{
              fontSize: 10,
              color: A.muted
            }}>{P.uploaded_at ? new Date(P.uploaded_at).toLocaleString("en-MY") : ""}</div></div>)}{u.length === 0 && <div style={{
            fontSize: 12,
            color: A.muted,
            textAlign: "center",
            padding: 20
          }}>No uploads yet — data loads when users upload their Apple Watch exports.</div>}</Card></div>}{o === "affiliates" && <div><div style={{
          background: "rgba(77,158,255,0.08)",
          border: "1px solid rgba(77,158,255,0.2)",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 11,
          color: A.blue,
          marginBottom: 14,
          display: "flex",
          gap: 8
        }}>ℹ️ Changes here update rotating banners on landing page and all 9 dashboard tabs. Propagates on next deploy.</div><div style={{
          display: "flex",
          gap: 6,
          marginBottom: 14
        }}>{[["manual", "Add manually"], ["bulk", "Bulk import CSV"]].map(([P, F]) => <button key={P} onClick={() => b(P)} style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: `1px solid ${O === P ? A.border2 : A.border}`,
            background: O === P ? A.surface2 : A.surface,
            color: O === P ? A.text : A.muted,
            fontSize: 11,
            fontWeight: 500,
            cursor: "pointer"
          }}>{F}</button>)}</div>{O === "manual" && <Card style={{
          marginBottom: 12
        }}><Label>Add single affiliate link</Label><div style={{
            display: "grid",
            gridTemplateColumns: "1.8fr 2fr 0.9fr 60px auto",
            gap: 8,
            alignItems: "end",
            marginBottom: 8
          }}>{[["Store name", "name", "text"], ["https://s.shopee.com.my/…", "url", "text"], ["Up to 21%", "commission", "text"], ["🌿", "icon", "text"]].map(([P, F]) => <input key={F} value={x[F]} onChange={G => g(U => ({
              ...U,
              [F]: G.target.value
            }))} placeholder={P} style={{
              background: A.surface2,
              border: `1px solid ${A.border2}`,
              borderRadius: 8,
              padding: "8px 10px",
              color: A.text,
              fontSize: 12,
              outline: "none"
            }} />)}<select value={x.color} onChange={P => g(F => ({
              ...F,
              color: P.target.value
            }))} style={{
              background: A.surface2,
              border: `1px solid ${A.border2}`,
              borderRadius: 8,
              padding: "8px 6px",
              color: A.text,
              fontSize: 12,
              outline: "none"
            }}><option value="#00FF88">Green</option><option value="#4D9EFF">Blue</option><option value="#FFD60A">Yellow</option><option value="#FF3B5C">Red</option><option value="#BF5AF2">Purple</option></select></div><div style={{
            display: "flex",
            alignItems: "center",
            gap: 10
          }}><button onClick={R} style={{
              background: A.accent,
              color: "#000",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer"
            }}>Add →</button>{y && <span style={{
              fontSize: 11,
              color: y.startsWith("✓") ? A.accent : A.red
            }}>{y}</span>}</div></Card>}{O === "bulk" && <Card style={{
          marginBottom: 12
        }}><Label>Bulk import — Shopee BatchShopLinks CSV</Label><div style={{
            border: `1.5px dashed ${A.border2}`,
            borderRadius: 10,
            padding: 24,
            textAlign: "center",
            marginBottom: 12,
            cursor: "pointer",
            background: A.surface2
          }} onClick={() => document.getElementById("csv-upload").click()} onDragOver={P => P.preventDefault()} onDrop={P => {
            P.preventDefault(), W(P.dataTransfer.files[0]);
          }}><div style={{
              fontSize: 28,
              marginBottom: 8
            }}>📄</div><div style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 4
            }}>Drop your Shopee CSV here</div><div style={{
              fontSize: 10,
              color: A.muted
            }}>or click to browse · Reads: Offer Name, Commission Rate, Trackable Link_short</div><input id="csv-upload" type="file" accept=".csv" style={{
              display: "none"
            }} onChange={P => W(P.target.files[0])} /></div>{S.length > 0 && <div><div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8
            }}><div style={{
                fontSize: 12,
                fontWeight: 600
              }}>{S.length}{" rows · "}{S.filter(P => !P.duplicate).length}{" new · "}{S.filter(P => P.duplicate).length}{" duplicate"}</div><div style={{
                display: "flex",
                gap: 6
              }}><button onClick={() => j(P => P.map(F => ({
                  ...F,
                  selected: true
                })))} style={{
                  fontSize: 10,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: `1px solid ${A.border}`,
                  background: A.surface2,
                  color: A.sub,
                  cursor: "pointer"
                }}>All</button><button onClick={() => j(P => P.map(F => ({
                  ...F,
                  selected: false
                })))} style={{
                  fontSize: 10,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: `1px solid ${A.border}`,
                  background: A.surface2,
                  color: A.sub,
                  cursor: "pointer"
                }}>None</button></div></div><div style={{
              maxHeight: 220,
              overflowY: "auto",
              border: `1px solid ${A.border}`,
              borderRadius: 8,
              marginBottom: 10
            }}>{S.map((P, F) => <div key={F} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderBottom: `1px solid ${A.border}`,
                opacity: P.duplicate ? 0.5 : 1
              }}><input type="checkbox" checked={P.selected} onChange={G => j(U => U.map((J, ce) => ce === F ? {
                  ...J,
                  selected: G.target.checked
                } : J))} style={{
                  cursor: "pointer"
                }} /><span style={{
                  fontSize: 16
                }}>{P.icon}</span><div style={{
                  flex: 1,
                  overflow: "hidden"
                }}><div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>{P.name}</div><div style={{
                    fontSize: 9,
                    color: A.muted,
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>{P.url}</div></div><div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: P.color,
                  flexShrink: 0,
                  background: `${P.color}18`,
                  padding: "2px 8px",
                  borderRadius: 99
                }}>{P.commission}</div>{P.duplicate && <div style={{
                  fontSize: 9,
                  color: A.yellow,
                  flexShrink: 0
                }}>Duplicate</div>}</div>)}</div><div style={{
              display: "flex",
              gap: 8,
              alignItems: "center"
            }}><button onClick={I} style={{
                background: A.accent,
                color: "#000",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer"
              }}>Import selected ({S.filter(P => P.selected).length})</button><button onClick={() => j([])} style={{
                background: A.surface2,
                color: A.sub,
                border: `1px solid ${A.border}`,
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                cursor: "pointer"
              }}>Cancel</button>{A && <span style={{
                fontSize: 11,
                color: A.startsWith("✓") ? A.accent : A.red
              }}>{A}</span>}</div></div>}{A && !S.length && <div style={{
            fontSize: 11,
            color: A.red,
            marginTop: 6
          }}>{A}</div>}</Card>}<Card><div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4
          }}><div><Label style={{
                margin: 0
              }}>Active affiliate links ({p.length}){v ? " — loading…" : ""}</Label></div></div><div style={{
            fontSize: 10,
            color: A.sub,
            marginBottom: 12,
            lineHeight: 1.5
          }}>Every link here appears everywhere in the app automatically — footer banner, per-tab recommendations, AI Coach, and the landing page — no per-placement setup needed. Newest links are shown more often than older ones.</div>{p.map(P => <div key={P.id || P.url} style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 0",
            borderBottom: `1px solid ${A.border}`
          }}><div style={{
              fontSize: 18,
              width: 30,
              textAlign: "center",
              flexShrink: 0
            }}>{P.icon}</div><div style={{
              flex: 1,
              overflow: "hidden"
            }}><div style={{
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>{P.name}</div><div style={{
                fontSize: 10,
                color: A.muted,
                fontFamily: "monospace",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>{P.url}</div></div><div style={{
              fontSize: 10,
              fontWeight: 600,
              color: P.color,
              flexShrink: 0,
              background: `${P.color}18`,
              padding: "2px 8px",
              borderRadius: 99
            }}>{P.commission}</div><div style={{
              display: "flex",
              gap: 5,
              flexShrink: 0
            }}><button onClick={() => {
                navigator.clipboard.writeText(P.url).catch(() => {});
              }} style={{
                fontSize: 10,
                padding: "4px 8px",
                borderRadius: 6,
                border: `1px solid ${A.border}`,
                background: A.surface2,
                color: A.sub,
                cursor: "pointer"
              }}>Copy</button><button onClick={async () => {
                const F = p;
                h(G => G.filter(U => U.id !== P.id));
                try {
                  P.id && (await deleteAffiliate(P.id));
                } catch (G) {
                  h(F), m("Delete failed: " + G.message);
                }
              }} style={{
                fontSize: 10,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid rgba(255,59,92,0.3)",
                background: "rgba(255,59,92,0.08)",
                color: A.red,
                cursor: "pointer"
              }}>✕</button></div></div>)}</Card></div>}{o === "users" && <Card><Label>All users ({l.length})</Label>{l.length === 0 && <div style={{
          fontSize: 12,
          color: A.muted,
          textAlign: "center",
          padding: 24
        }}>No users yet</div>}{l.map((P, F) => <div key={F} style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "9px 0",
          borderBottom: `1px solid ${A.border}`
        }}><div style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: A.text
          }}>{(P.device_id || P.fingerprint || "").slice(0, 12)}…</div><div style={{
            fontSize: 10,
            color: A.muted
          }}>{P.created_at ? new Date(P.created_at).toLocaleDateString("en-MY") : ""}</div></div>)}</Card>}{o === "uploads" && <Card><Label>Recent uploads ({u.length})</Label>{u.length === 0 && <div style={{
          fontSize: 12,
          color: A.muted,
          textAlign: "center",
          padding: 24
        }}>No uploads yet</div>}{u.map((P, F) => <div key={F} style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "9px 0",
          borderBottom: `1px solid ${A.border}`
        }}><div><div style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: A.text
            }}>{(P.device_id || "").slice(0, 12)}…</div><div style={{
              fontSize: 10,
              color: A.muted
            }}>{P.start_date}{" → "}{P.end_date}{" · "}{P.duration_label}</div></div><div style={{
            fontSize: 10,
            color: A.muted
          }}>{P.uploaded_at ? new Date(P.uploaded_at).toLocaleString("en-MY") : ""}</div></div>)}</Card>}</div></div>;
}

export default Admin
