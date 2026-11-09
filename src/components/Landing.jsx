import { useState, useEffect, useRef } from 'react'
import { getAffiliatesCached, weightedAffiliateRotation, trackUpload } from '../lib/supabase'
import { parseHealthZip } from '../lib/parseHealth'

const SIMPLE_HEALTH_URL = "https://apps.apple.com/us/app/simple-health-export-csv/id1535380115",
  LANGS = {
    EN: {
      eyebrow: "Built for Health-Conscious Users",
      headline1: "A smarter way to see your Apple Watch data —",
      headline2: "with AI Coaching and Nutrition tracking built in.",
      headline3: "",
      sub: "Upload your Apple Health export and get a personalised health intelligence dashboard — Readiness, Sleep, VO2 Max, AI Coach and more.",
      dropTitle: "Drop your Apple Health ZIP here",
      dropSub: "Exported from Simple Health Export CSV",
      dropLink: "or click to browse",
      privacy: "🔒 Processed locally — data never leaves your device",
      demo: "No data yet?",
      demoLink: "",
      step1title: "Download Simple Health Export CSV",
      step1sub: "Free on App Store · Tap to download →",
      step2title: "Export your Apple Watch data",
      step2sub: "Connect Health → Include Series Data → Export ZIP",
      step3title: "Upload here — dashboard loads instantly",
      step3sub: "Readiness · Sleep · Effort · AI Coach · Longevity",
      stat1: "RHR improvement",
      stat2: "VO2 Max reached",
      stat3: "Stress reduction",
      stat4: "Data tracked",
      features: ["💚 Readiness", "😴 Sleep", "🔥 Effort", "🫀 Vitals", "📊 Habits", "💉 Blood Pressure"],
      featPro: ["✨ AI Coach", "🧬 Longevity"]
    },
    BM: {
      eyebrow: "Dibina untuk pengguna Apple Watch",
      headline1: "Jam tangan anda menyimpan",
      headline2: "bulan cerapan",
      headline3: "kesihatan tersembunyi.",
      sub: "Muat naik eksport Apple Health anda dan dapatkan dashboard kecerdasan kesihatan peribadi — Kesediaan, Tidur, VO2 Max, Jurulatih AI dan banyak lagi.",
      dropTitle: "Lepaskan ZIP Apple Health anda di sini",
      dropSub: "Dieksport dari Simple Health Export CSV",
      dropLink: "atau klik untuk semak imbas",
      privacy: "🔒 Diproses secara tempatan — data tidak meninggalkan peranti anda",
      demo: "Tiada data?",
      demoLink: "Cuba demo →",
      step1title: "Muat turun Simple Health Export CSV",
      step1sub: "Percuma di App Store · Ketik untuk muat turun →",
      step2title: "Eksport data Apple Watch anda",
      step2sub: "Sambung Health → Sertakan Data Siri → Eksport ZIP",
      step3title: "Muat naik di sini — dashboard dimuatkan serta-merta",
      step3sub: "Kesediaan · Tidur · Usaha · Jurulatih AI · Umur Panjang",
      stat1: "Peningkatan RHR",
      stat2: "VO2 Max dicapai",
      stat3: "Pengurangan tekanan",
      stat4: "Data dijejak",
      features: ["💚 Kesediaan", "😴 Tidur", "🔥 Usaha", "🫀 Vital", "📊 Tabiat", "💉 Tekanan Darah"],
      featPro: ["✨ Jurulatih AI", "🧬 Umur Panjang"]
    },
    ZH: {
      eyebrow: "专为 Apple Watch 用户打造",
      headline1: "你的手表记录了",
      headline2: "数月的隐藏",
      headline3: "健康洞察。",
      sub: "上传你的 Apple Health 导出文件，即时获得个性化健康智能仪表盘 — 准备状态、睡眠、VO2 Max、AI 教练等等。",
      dropTitle: "将 Apple Health ZIP 文件拖到这里",
      dropSub: "从 Simple Health Export CSV 导出",
      dropLink: "或点击浏览",
      privacy: "🔒 本地处理 — 数据不会离开您的设备",
      demo: "还没有数据？",
      demoLink: "试用演示 →",
      step1title: "下载 Simple Health Export CSV",
      step1sub: "App Store 免费下载 · 点击下载 →",
      step2title: "导出您的 Apple Watch 数据",
      step2sub: "连接 Health → 包含系列数据 → 导出 ZIP",
      step3title: "上传到这里 — 仪表盘即时加载",
      step3sub: "准备状态 · 睡眠 · 努力 · AI教练 · 长寿",
      stat1: "RHR 改善",
      stat2: "VO2 Max 达到",
      stat3: "压力减少",
      stat4: "数据追踪",
      features: ["💚 准备状态", "😴 睡眠分析", "🔥 努力评分", "🫀 健康监测", "📊 习惯洞察", "💉 血压"],
      featPro: ["✨ AI 教练", "🧬 长寿评分"]
    },
    TA: {
      eyebrow: "Apple Watch பயனர்களுக்காக",
      headline1: "உங்கள் கடிகாரம் கொண்டுள்ளது",
      headline2: "மாதக்கணக்கான மறைக்கப்பட்ட",
      headline3: "உடல்நல தகவல்கள்.",
      sub: "உங்கள் Apple Health ஏற்றுமதியை பதிவேற்றி தனிப்பயனாக்கப்பட்ட சுகாதார டாஷ்போர்டை பெறுங்கள்.",
      dropTitle: "உங்கள் Apple Health ZIP ஐ இங்கே இழுக்கவும்",
      dropSub: "Simple Health Export CSV இலிருந்து ஏற்றுமதி",
      dropLink: "அல்லது உலாவ கிளிக் செய்யவும்",
      privacy: "🔒 உள்ளூரில் செயலாக்கப்பட்டது — தரவு உங்கள் சாதனத்தை விட்டு வெளியேறாது",
      demo: "தரவு இல்லையா?",
      demoLink: "டெமோ முயற்சி →",
      step1title: "Simple Health Export CSV பதிவிறக்கவும்",
      step1sub: "App Store இல் இலவசம் · பதிவிறக்க தட்டவும் →",
      step2title: "உங்கள் Apple Watch தரவை ஏற்றுமதி செய்யவும்",
      step2sub: "Health இணைக்கவும் → தொடர் தரவை சேர்க்கவும் → ZIP ஏற்றுமதி",
      step3title: "இங்கே பதிவேற்றவும் — டாஷ்போர்டு உடனடியாக ஏற்றப்படும்",
      step3sub: "தயார்நிலை · தூக்கம் · முயற்சி · AI பயிற்சியாளர்",
      stat1: "RHR மேம்பாடு",
      stat2: "VO2 Max அடைந்தது",
      stat3: "மன அழுத்தம் குறைப்பு",
      stat4: "தரவு கண்காணிக்கப்பட்டது",
      features: ["💚 தயார்நிலை", "😴 தூக்கம்", "🔥 முயற்சி", "🫀 உடல்நலம்", "📊 பழக்கங்கள்", "💉 இரத்த அழுத்தம்"],
      featPro: ["✨ AI பயிற்சியாளர்", "🧬 நீண்ட ஆயுள்"]
    }
  },
  HERO_IMAGE = "https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&w=900";

function timeAgo(e) {
  const t = new Date(e);
  if (isNaN(t.getTime())) return "";
  const r = Date.now() - t.getTime(),
    n = Math.round(r / 60000);
  if (n < 1) return "just now";
  if (n < 60) return `${n} min${n !== 1 ? "s" : ""} ago`;
  const i = Math.round(n / 60);
  if (i < 24) return `${i} hour${i !== 1 ? "s" : ""} ago`;
  const o = Math.round(i / 24);
  return o < 30 ? `${o} day${o !== 1 ? "s" : ""} ago` : t.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

const SHOWCASE_SLIDES = [{
  label: "💚 Readiness",
  color: "#00FF88",
  content: <div><div style={{
      display: "flex",
      gap: 8,
      alignItems: "center",
      marginBottom: 8
    }}><svg width="52" height="52" style={{
        filter: "drop-shadow(0 0 6px rgba(0,255,136,0.5))",
        flexShrink: 0
      }}><circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" /><circle cx="26" cy="26" r="20" fill="none" stroke="#00FF88" strokeWidth="6" strokeDasharray="98 126" strokeLinecap="round" transform="rotate(-90 26 26)" /><text x="26" y="30" textAnchor="middle" fill="#00FF88" fontSize="13" fontWeight="900" fontFamily="Inter">78</text></svg><div style={{
        flex: 1
      }}><div style={{
          fontSize: 8,
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom: 2
        }}>Readiness Score</div><div style={{
          fontSize: 18,
          fontWeight: 900,
          color: "#00FF88",
          lineHeight: 1
        }}>Great</div><div style={{
          fontSize: 9,
          color: "rgba(255,255,255,0.5)"
        }}>Body primed · Push today</div></div><div style={{
        textAlign: "right"
      }}><div style={{
          fontSize: 8,
          color: "rgba(255,255,255,0.4)"
        }}>9-month trend</div><div style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#00FF88"
        }}>+19 pts ↑</div></div></div><div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 5
    }}>{[["HRV", "48.9ms", "#00FF88", 78], ["RHR", "63 bpm", "#00FF88", 85], ["SpO2", "96.3%", "#4D9EFF", 90]].map(([e, t, r, n]) => <div key={e} style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 8,
        padding: 6
      }}><div style={{
          fontSize: 7,
          color: "rgba(255,255,255,0.4)",
          marginBottom: 2
        }}>{e}</div><div style={{
          fontSize: 13,
          fontWeight: 900,
          color: r
        }}>{t}</div><div style={{
          background: "rgba(255,255,255,0.08)",
          borderRadius: 99,
          height: 3,
          marginTop: 3
        }}><div style={{
            width: n + "%",
            height: "100%",
            background: r,
            borderRadius: 99
          }} /></div></div>)}</div></div>
}, {
  label: "😴 Sleep",
  color: "#4D9EFF",
  content: <div><div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8
    }}><div><div style={{
          fontSize: 8,
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom: 2
        }}>Vitality Score · Last Night</div><div style={{
          fontSize: 28,
          fontWeight: 900,
          color: "#4D9EFF",
          lineHeight: 1
        }}>70%</div><div style={{
          fontSize: 9,
          color: "rgba(255,255,255,0.5)"
        }}>6.0 hrs · Jun 27</div></div><div style={{
        textAlign: "right"
      }}><div style={{
          fontSize: 8,
          color: "rgba(255,255,255,0.4)"
        }}>Sleep need</div><div style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#fff"
        }}>7.8 hrs</div><div style={{
          fontSize: 9,
          color: "#FFD60A",
          fontWeight: 700
        }}>Debt: 1.8 hrs</div></div></div><div style={{
      display: "flex",
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      gap: 2,
      marginBottom: 6
    }}><div style={{
        width: "7%",
        background: "rgba(255,255,255,0.2)"
      }} /><div style={{
        width: "58%",
        background: "#4D9EFF",
        opacity: 0.75
      }} /><div style={{
        width: "13%",
        background: "#00FF88"
      }} /><div style={{
        width: "22%",
        background: "#BF5AF2"
      }} /></div><div style={{
      display: "flex",
      gap: 8
    }}>{[["Awake 0.4h", "rgba(255,255,255,0.4)"], ["Core 3.5h", "#4D9EFF"], ["Deep 0.75h", "#00FF88"], ["REM 1.35h", "#BF5AF2"]].map(([e, t]) => <span key={e} style={{
        fontSize: 9,
        color: t
      }}>{e}</span>)}</div></div>
}, {
  label: "🔥 Effort",
  color: "#FFD60A",
  content: <div style={{
    display: "flex",
    gap: 10,
    alignItems: "center"
  }}><div><div style={{
        fontSize: 8,
        color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginBottom: 2
      }}>VO2 Max · All-time</div><div style={{
        fontSize: 30,
        fontWeight: 900,
        color: "#FFD60A",
        lineHeight: 1
      }}>42.2</div><div style={{
        fontSize: 9,
        color: "rgba(255,255,255,0.5)"
      }}>mL/kg/min</div><div style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#00FF88",
        marginTop: 2
      }}>Excellent 🎯</div></div><div style={{
      flex: 1
    }}><div style={{
        fontSize: 8,
        color: "rgba(255,255,255,0.4)",
        marginBottom: 4
      }}>9-month journey</div><div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 2,
        height: 45
      }}>{[55, 72, 68, 63, 68, 72, 86, 100].map((e, t) => <div key={t} style={{
          flex: 1,
          background: e > 80 ? "#00FF88" : "#FFD60A",
          opacity: 0.5 + e / 200,
          borderRadius: "2px 2px 0 0",
          height: e + "%"
        }} />)}</div><div style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 2
      }}><span style={{
          fontSize: 8,
          color: "rgba(255,255,255,0.3)"
        }}>Oct'25: 35.3</span><span style={{
          fontSize: 8,
          fontWeight: 700,
          color: "#00FF88"
        }}>Jun'26: 42.2 ↑</span></div></div></div>
}, {
  label: "🫀 Vitals",
  color: "#00FF88",
  content: <div><div style={{
      fontSize: 8,
      color: "rgba(255,255,255,0.4)",
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 6
    }}>Health Monitor · Today</div><svg width="100%" height="22" viewBox="0 0 300 22" preserveAspectRatio="none" style={{
      marginBottom: 8
    }}><polyline points="0,11 40,11 60,11 75,2 90,20 105,11 150,11 170,5 190,17 210,11 300,11" fill="none" stroke="#00FF88" strokeWidth="2" opacity="0.8" /></svg><div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr 1fr",
      gap: 5
    }}>{[["❤️ RHR", "63", "bpm", "#00FF88"], ["⚡ HRV", "48.9", "ms", "#FFD60A"], ["🫧 SpO2", "96.3", "%", "#4D9EFF"], ["🧠 Stress", "11", "/100", "#00FF88"]].map(([e, t, r, n]) => <div key={e} style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 8,
        padding: 6,
        textAlign: "center"
      }}><div style={{
          fontSize: 7,
          color: "rgba(255,255,255,0.4)",
          marginBottom: 2
        }}>{e}</div><div style={{
          fontSize: 14,
          fontWeight: 900,
          color: n
        }}>{t}</div><div style={{
          fontSize: 7,
          color: "rgba(255,255,255,0.3)"
        }}>{r}</div></div>)}</div></div>
}, {
  label: "📊 Habits",
  color: "#00FF88",
  content: <div><div style={{
      fontSize: 8,
      color: "rgba(255,255,255,0.4)",
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 6
    }}>Habit Insights · Your data</div><div style={{
      display: "flex",
      flexDirection: "column",
      gap: 5
    }}>{[["✅ Tennis 2+/week", "+12% Readiness", "#00FF88", "rgba(0,255,136,0.05)", "rgba(0,255,136,0.12)"], ["✅ Sleep before midnight", "+9% Readiness", "#00FF88", "rgba(0,255,136,0.05)", "rgba(0,255,136,0.12)"], ["⚠️ Sleep under 5 hrs", "−18% Readiness", "#FF3B5C", "rgba(255,59,92,0.05)", "rgba(255,59,92,0.15)"]].map(([e, t, r, n, i]) => <div key={e} style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px 8px",
        background: n,
        borderRadius: 7,
        border: "1px solid " + i
      }}><span style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.75)"
        }}>{e}</span><span style={{
          fontSize: 10,
          fontWeight: 700,
          color: r
        }}>{t}</span></div>)}</div></div>
}, {
  label: "🍽️ Nutrition",
  color: "#FFD60A",
  content: <div><div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 8
    }}><div><div style={{
          fontSize: 8,
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom: 2
        }}>Today</div><div style={{
          fontSize: 24,
          fontWeight: 900,
          color: "#FFD60A",
          lineHeight: 1
        }}>1,450<span style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            fontWeight: 600
          }}>{" / 2,150 kcal"}</span></div></div><div style={{
        fontSize: 9,
        color: "rgba(255,255,255,0.5)"
      }}>3 meals logged</div></div><div style={{
      background: "rgba(255,255,255,0.08)",
      borderRadius: 99,
      height: 5,
      marginBottom: 8
    }}><div style={{
        width: "67%",
        height: "100%",
        background: "#FFD60A",
        borderRadius: 99
      }} /></div><div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 8,
      padding: 8,
      display: "flex",
      alignItems: "center",
      gap: 8
    }}><span style={{
        fontSize: 16
      }}>📷</span><div style={{
        flex: 1
      }}><div style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#fff"
        }}>Snap a meal photo</div><div style={{
          fontSize: 8,
          color: "rgba(255,255,255,0.45)"
        }}>AI estimates calories & macros instantly</div></div></div></div>
}, {
  label: "✨ AI Coach",
  color: "#BF5AF2",
  content: <div><div style={{
      fontSize: 8,
      color: "rgba(255,255,255,0.4)",
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 6
    }}>AI Health Coach</div><div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 8,
      padding: 8,
      fontSize: 10,
      color: "rgba(255,255,255,0.8)",
      lineHeight: 1.6,
      marginBottom: 6
    }}>{"Readiness "}<span style={{
        color: "#00FF88",
        fontWeight: 700
      }}>78%</span>{" — HRV 41% above your 34.7ms baseline. Your body is primed. Go hard today, target effort 14–16."}</div><div style={{
      background: "rgba(191,90,242,0.12)",
      border: "1px solid rgba(191,90,242,0.2)",
      borderRadius: 8,
      padding: "6px 10px",
      fontSize: 10,
      color: "rgba(255,255,255,0.85)",
      textAlign: "right"
    }}>Should I play tennis today?</div></div>
}];

function FeatureShowcase() {
  const [e, t] = useState(0),
    [r, n] = useState(0);
  useEffect(() => {
    const a = setInterval(() => {
      t(l => (l + 1) % SHOWCASE_SLIDES.length), n(l => l + 1);
    }, 5000);
    return () => clearInterval(a);
  }, []);
  const i = a => {
      t(a), n(l => l + 1);
    },
    o = SHOWCASE_SLIDES[e];
  return <div style={{
    position: "relative",
    zIndex: 5,
    marginBottom: 4
  }}><div style={{
      background: "rgba(10,10,15,0.88)",
      backdropFilter: "blur(16px)",
      borderRadius: 14,
      padding: "12px 14px",
      border: "1px solid " + o.color + "28",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px " + o.color + "15",
      marginBottom: 8,
      minHeight: 130,
      transition: "border-color 0.4s ease"
    }}><div key={r} style={{
        animation: "fadeIn 0.4s ease"
      }}>{o.content}</div></div><div style={{
      display: "flex",
      gap: 5,
      overflowX: "auto",
      scrollbarWidth: "none",
      paddingBottom: 2
    }}>{SHOWCASE_SLIDES.map((a, l) => <button key={a.label} onClick={() => i(l)} style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "5px 10px",
        borderRadius: 99,
        border: "1px solid " + (l === e ? a.color + "66" : "rgba(255,255,255,0.10)"),
        cursor: "pointer",
        fontSize: 10,
        fontWeight: 700,
        background: l === e ? a.color + "18" : "rgba(255,255,255,0.05)",
        color: l === e ? a.color : "rgba(255,255,255,0.50)",
        position: "relative",
        overflow: "hidden",
        boxShadow: l === e ? "0 0 8px " + a.color + "33" : "none",
        transition: "all 0.3s",
        whiteSpace: "nowrap"
      }}>{a.label}{l === e && <div key={r} style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 2,
          background: a.color,
          animation: "progBar 5s linear forwards",
          borderRadius: 99
        }} />}</button>)}</div><style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
        @keyframes progBar { from { width:0% } to { width:100% } }
      `}</style></div>;
}

const DEFAULT_AFFILIATES = [{
  icon: "🌿",
  label: "Health Natural Life",
  sub: "Natural health supplements",
  url: "https://s.shopee.com.my/3qLGjujtTt",
  color: "#00FF88"
}, {
  icon: "💊",
  label: "Nova Health",
  sub: "Premium health products",
  url: "https://s.shopee.com.my/3B5ZwgmQpp",
  color: "#00FF88"
}, {
  icon: "🏥",
  label: "Health Origins",
  sub: "Trusted health store",
  url: "https://s.shopee.com.my/50XE83fS7E",
  color: "#00FF88"
}, {
  icon: "💪",
  label: "Health Master MY",
  sub: "Workout & recovery supplements",
  url: "https://s.shopee.com.my/1VxLxcsmDP",
  color: "#4D9EFF"
}, {
  icon: "❤️",
  label: "HAPPY HEALTH MALAYSIA",
  sub: "Complete health range",
  url: "https://s.shopee.com.my/2qSjY4nhVn",
  color: "#FFD60A"
}, {
  icon: "🩺",
  label: "Female Health",
  sub: "Women's health & wellness",
  url: "https://s.shopee.com.my/40egwDjG98",
  color: "#FF3B5C"
}, {
  icon: "🏠",
  label: "Health Home",
  sub: "Home health essentials",
  url: "https://s.shopee.com.my/3g1qXbkWoq",
  color: "#4D9EFF"
}, {
  icon: "🥗",
  label: "Healthy Snacks Malaysia",
  sub: "Healthy snacks & nutrition",
  url: "https://s.shopee.com.my/4VaxX8hM8D",
  color: "#FFD60A"
}, {
  icon: "⚗️",
  label: "Health Supplements Store MY",
  sub: "Vitamins & supplements",
  url: "https://s.shopee.com.my/1qaCMErVXR",
  color: "#BF5AF2"
}, {
  icon: "🩻",
  label: "Health@Care",
  sub: "Healthcare essentials",
  url: "https://s.shopee.com.my/4fuNjRginC",
  color: "#BF5AF2"
}, {
  icon: "✨",
  label: "TY Healthy Store",
  sub: "Health essentials",
  url: "https://s.shopee.com.my/5AqeKMeomH",
  color: "#FFD60A"
}, {
  icon: "🌺",
  label: "Health Freedom For All",
  sub: "Health & wellness",
  url: "https://s.shopee.com.my/3ViQLIlA9r",
  color: "#00FF88"
}, {
  icon: "🐻",
  label: "Little Bear Healthy Family",
  sub: "Family health products",
  url: "https://s.shopee.com.my/30m9kNn4Am",
  color: "#FFD60A"
}, {
  icon: "🌸",
  label: "Malaysia Anshenyue Healthcare",
  sub: "Traditional health products",
  url: "https://s.shopee.com.my/2g9JLloKqk",
  color: "#BF5AF2"
}, {
  icon: "💚",
  label: "healthylife85jn.my",
  sub: "Healthy lifestyle products",
  url: "https://s.shopee.com.my/4LHXKphzTA",
  color: "#00FF88"
}, {
  icon: "🏡",
  label: "aushealthwarehouseks.my",
  sub: "Health warehouse",
  url: "https://s.shopee.com.my/4qDnvkg5SF",
  color: "#4D9EFF"
}, {
  icon: "🏥",
  label: "dellabeauty and health",
  sub: "Beauty & health",
  url: "https://s.shopee.com.my/3LP08zlnUo",
  color: "#FF3B5C"
}, {
  icon: "🔒",
  label: "HealthVault.my",
  sub: "Trusted health products",
  url: "https://s.shopee.com.my/1LdvlJtPYM",
  color: "#4D9EFF"
}, {
  icon: "💊",
  label: "SR Health & Beauty",
  sub: "Health & beauty",
  url: "https://s.shopee.com.my/2BD2kqqErT",
  color: "#BF5AF2"
}, {
  icon: "💊",
  label: "KK Health Pharmacy",
  sub: "Trusted pharmacy",
  url: "https://s.shopee.com.my/1gGm9vs8sO",
  color: "#4D9EFF"
}];

function AffiliateBanner() {
  const [e, t] = useState(0),
    [r, n] = useState(DEFAULT_AFFILIATES);
  useEffect(() => {
    getAffiliatesCached().then(o => {
      if (o && o.length > 0) {
        const a = o.map(l => ({
          icon: l.icon,
          label: l.name,
          sub: "",
          url: l.url,
          color: l.color || "#00FF88"
        }));
        n(weightedAffiliateRotation(a));
      }
    }).catch(() => {});
  }, []), useEffect(() => {
    const o = setInterval(() => t(a => (a + 1) % r.length), 15000);
    return () => clearInterval(o);
  }, [r.length]);
  const i = r[e % r.length];
  return <div style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 16px",
    background: "rgba(10,10,15,0.88)",
    backdropFilter: "blur(12px)",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    flexShrink: 0
  }}><div style={{
      fontSize: 8,
      color: "rgba(255,255,255,0.28)",
      textTransform: "uppercase",
      letterSpacing: 1.5,
      flexShrink: 0
    }}>Sponsored</div><span style={{
      fontSize: 18,
      flexShrink: 0
    }}>{i.icon}</span><div style={{
      flex: 1,
      overflow: "hidden"
    }}><div style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#fff",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }}>{i.label}</div><div style={{
        fontSize: 9,
        color: "rgba(255,255,255,0.45)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }}>{i.sub}{" · Shopee MY"}</div></div><a href={i.url} target="_blank" rel="noopener noreferrer" style={{
      flexShrink: 0,
      padding: "5px 12px",
      borderRadius: 99,
      background: i.color,
      color: "#000",
      fontSize: 9,
      fontWeight: 800,
      textDecoration: "none"
    }}>Shop →</a></div>;
}

function Landing({
  onUpload: e,
  onDemo: t,
  onNutritionOnly: r,
  onLimitReached: n,
  uploadCount: i = 0,
  freeLimit: o = 5,
  isPro: a = false,
  hasExistingData: l = false,
  lastUploadedAt: s = null,
  onGoToDashboard: u,
  lang: f = "EN",
  onLangChange: c
}) {
  const [p, h] = useState(false),
    [v, w] = useState(false),
    [x, g] = useState(""),
    [y, m] = useState(""),
    O = useRef(),
    b = LANGS[f] || LANGS.EN,
    [S, j] = useState(() => typeof window < "u" && window.innerWidth < 820);
  useEffect(() => {
    const k = () => j(window.innerWidth < 820);
    return k(), window.addEventListener("resize", k), () => window.removeEventListener("resize", k);
  }, []);
  const A = async k => {
      if (k) {
        if (!k.name.endsWith(".zip")) {
          m("Please upload a ZIP file from the Simple Health Export CSV app.");
          return;
        }
        w(true), m("");
        try {
          g("Reading ZIP file…"), await new Promise(z => setTimeout(z, 100)), g("Parsing your health metrics…");
          const D = await parseHealthZip(k);
          g("Saving your progress…"), await new Promise(z => setTimeout(z, 200));
          let R = i + 1;
          try {
            R = await trackUpload(D.meta || {});
          } catch (z) {
            console.warn("Supabase:", z);
          }
          g("Building your dashboard…"), await new Promise(z => setTimeout(z, 300)), e(D, R);
        } catch (L) {
          console.error("Parse error:", L), m("Error: " + L.message), w(false);
        }
      }
    },
    _ = k => {
      k.preventDefault(), h(false), A(k.dataTransfer.files[0]);
    },
    E = ["EN", "BM", "ZH", "TA"],
    C = {
      EN: "EN",
      BM: "BM",
      ZH: "中文",
      TA: "தமிழ்"
    };
  return <div style={{
    minHeight: "100vh",
    fontFamily: "'Inter',system-ui,sans-serif",
    background: "#0A0A0F",
    color: "#fff",
    position: "relative",
    display: "flex",
    flexDirection: "column"
  }}><div style={{
      position: "fixed",
      inset: 0,
      zIndex: 0,
      backgroundImage: `url('${HERO_IMAGE}')`,
      backgroundSize: "cover",
      backgroundPosition: "center 30%",
      filter: "brightness(0.50) saturate(0.90)"
    }} /><div style={{
      position: "fixed",
      inset: 0,
      zIndex: 1,
      background: "rgba(10,10,15,0.72)"
    }} /><div style={{
      position: "fixed",
      width: 300,
      height: 300,
      background: "#00FF88",
      borderRadius: "50%",
      filter: "blur(100px)",
      opacity: 0.05,
      top: -80,
      left: -60,
      zIndex: 1
    }} /><nav style={{
      position: "relative",
      zIndex: 10,
      background: "rgba(10,10,15,0.55)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      padding: "10px 20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexShrink: 0
    }}><div style={{
        display: "flex",
        alignItems: "center",
        gap: 8
      }}><div style={{
          width: 30,
          height: 30,
          background: "#00FF88",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16
        }}>🧬</div><div><div style={{
            fontSize: 15,
            fontWeight: 900,
            color: "#fff"
          }}>VitaIQ</div><div style={{
            fontSize: 7,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: 1.5
          }}>HEALTH INTELLIGENCE</div></div></div><div style={{
        display: "flex",
        alignItems: "center",
        gap: 6
      }}>{l && <button onClick={u} style={{
          padding: "5px 12px",
          borderRadius: 99,
          background: "rgba(0,255,136,0.12)",
          color: "#00FF88",
          fontSize: 10,
          fontWeight: 700,
          border: "1px solid rgba(0,255,136,0.3)",
          cursor: "pointer"
        }}>← My dashboard</button>}{E.map(k => <button key={k} onClick={() => c && c(k)} style={{
          padding: "4px 10px",
          borderRadius: 99,
          fontSize: 9,
          fontWeight: 700,
          cursor: "pointer",
          border: "none",
          background: f === k ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.06)",
          color: f === k ? "#00FF88" : "rgba(255,255,255,0.55)",
          outline: f === k ? "1px solid rgba(0,255,136,0.4)" : "1px solid rgba(255,255,255,0.12)"
        }}>{C[k]}</button>)}</div></nav><div style={{
      padding: "12px 16px 0"
    }}><FeatureShowcase /></div><div style={{
      position: "relative",
      zIndex: 5,
      flex: 1,
      display: "grid",
      gridTemplateColumns: S ? "1fr" : "1fr 1fr",
      gap: 20,
      padding: S ? "12px 16px 24px" : "12px 24px 10px",
      alignItems: S ? "start" : "center"
    }}><div><div style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#00FF88",
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6
        }}><span style={{
            display: "block",
            width: 16,
            height: 1,
            background: "#00FF88"
          }} />{b.eyebrow}</div><div style={{
          fontSize: "clamp(20px,2.6vw,30px)",
          fontWeight: 900,
          lineHeight: 1.3,
          letterSpacing: -0.3,
          marginBottom: 16
        }}>{b.headline1}<br /><span style={{
            color: "#00FF88"
          }}>{b.headline2}</span>{b.headline3 && <><br />{b.headline3}</>}</div><div onDragOver={k => {
          k.preventDefault(), h(true);
        }} onDragLeave={() => h(false)} onDrop={_} onClick={() => {
          var k;
          return !v && ((k = O.current) == null ? undefined : k.click());
        }} style={{
          border: `1.5px dashed ${p ? "#00FF88" : "rgba(0,255,136,0.35)"}`,
          borderRadius: 12,
          padding: "16px",
          background: p ? "rgba(0,255,136,0.06)" : "rgba(0,255,136,0.02)",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          marginBottom: 8
        }}><input ref={O} type="file" accept=".zip" style={{
            display: "none"
          }} onChange={k => A(k.target.files[0])} />{v ? <div><div style={{
              fontSize: 24,
              marginBottom: 6
            }}>⚙️</div><div style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 6
            }}>{x}</div><div style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: 99,
              height: 4,
              maxWidth: 160,
              margin: "0 auto"
            }}><div style={{
                height: "100%",
                background: "#00FF88",
                borderRadius: 99,
                width: "70%",
                boxShadow: "0 0 8px rgba(0,255,136,0.4)"
              }} /></div></div> : <div><svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{
              marginBottom: 6
            }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg><div style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#fff",
              marginBottom: 3
            }}>{b.dropTitle}</div><div style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.4)",
              marginBottom: 6
            }}>{b.dropSub}</div><div style={{
              fontSize: 11,
              color: "#00FF88",
              fontWeight: 700
            }}>{b.dropLink}</div>{y && <div style={{
              color: "#FF3B5C",
              fontSize: 10,
              marginTop: 8,
              padding: "6px 10px",
              background: "rgba(255,59,92,0.1)",
              borderRadius: 6,
              border: "1px solid rgba(255,59,92,0.2)"
            }}>{y}</div>}</div>}</div><div style={{
          fontSize: 9,
          color: "rgba(255,255,255,0.28)",
          textAlign: "center",
          marginBottom: 14
        }}>{b.privacy}</div><a onClick={r} style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontSize: 12.5,
          color: "rgba(255,255,255,0.55)",
          cursor: "pointer",
          textDecoration: "none"
        }}>{"No Apple Watch? "}<b style={{
            color: "#FFD60A",
            fontWeight: 700
          }}>Track meals + AI Coach instead</b><svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{
            opacity: 0.7
          }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></a>{l && <div style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.4)",
          textAlign: "center",
          marginTop: 10
        }}><span onClick={u} style={{
            color: "#00FF88",
            fontWeight: 700,
            cursor: "pointer"
          }}>← Return to my dashboard</span>{s && <div style={{
            marginTop: 3,
            fontSize: 9,
            color: "rgba(255,255,255,0.3)"
          }}>{"Last uploaded "}{timeAgo(s)}</div>}</div>}</div><div style={{
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}><div style={{
          background: "rgba(12,12,18,0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: "12px 14px"
        }}><div style={{
            fontSize: 8,
            fontWeight: 700,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: 2,
            marginBottom: 10
          }}>All features included · Free</div><div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "7px 10px"
          }}>{[["⚡", "Daily Readiness", "Green/yellow/red zone + morning brief"], ["😴", "Sleep Analysis", "Stages, personal sleep need + sleep debt"], ["🔥", "Effort & Training Load", "VO2 Max trend + overtraining warning"], ["🫀", "Vitals Monitor", "HRV, RHR, SpO2, Resp Rate, Skin Temp"], ["📊", "Habit Insights", "Which habits boost or hurt your scores"], ["✨", "AI Health Coach", "Ask anything · 5 free messages"], ["🧬", "Longevity Score", "Biological age delta from your metrics"], ["💉", "Blood Pressure", "Your cuff readings + heart trend"], ["🫁", "Guided Breathwork", "4-4-8 box breathing to lower stress"], ["⚠️", "Health Alerts", "SpO2 dips and anomaly detection"]].map(([k, L, D]) => <div key={L} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6
            }}><span style={{
                fontSize: 14,
                flexShrink: 0,
                marginTop: 1
              }}>{k}</span><div><div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.2
                }}>{L}</div><div style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.42)",
                  lineHeight: 1.4
                }}>{D}</div></div></div>)}</div><div style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.07)",
            fontSize: 9,
            color: "rgba(255,255,255,0.3)",
            textAlign: "center"
          }}>Free forever · No subscription · No credit card</div></div><div style={{
          display: "flex",
          flexDirection: "column",
          gap: 5
        }}><div style={{
            fontSize: 8,
            fontWeight: 700,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: 2,
            marginBottom: 2
          }}>{b.howToStart || "How to get started"}</div>{[[1, b.step1title, b.step1sub, true], [2, b.step2title, b.step2sub, false], [3, b.step3title, b.step3sub, false]].map(([k, L, D, R]) => <div key={k} style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(12,12,18,0.80)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
            padding: "8px 12px",
            cursor: R ? "pointer" : "default"
          }} onClick={R ? () => window.open(SIMPLE_HEALTH_URL, "_blank") : undefined}><div style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#00FF88",
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 900,
              flexShrink: 0
            }}>{k}</div><div style={{
              flex: 1
            }}><div style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.3
              }}>{L}</div><div style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.45)",
                marginTop: 1,
                lineHeight: 1.3
              }}>{D}</div></div>{R && <span style={{
              color: "#00FF88",
              fontSize: 11
            }}>↗</span>}</div>)}</div></div></div><div style={{
      padding: "0 16px 16px"
    }}><div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
        maxWidth: 960,
        margin: "0 auto"
      }}>{[["🆓", "100% Free", "#00FF88", "No subscription, ever"], ["⌚", "Any Apple Watch", "#FFD60A", "Series 4 and newer"], ["🔒", "Private by Design", "#00FF88", "Processed on your device"], ["✨", "AI Coach Included", "#FFD60A", "Personalized, not templated"]].map(([k, L, D, R]) => <div key={L} style={{
          background: "rgba(12,12,18,0.82)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: "10px 12px"
        }}><div style={{
            fontSize: 16,
            marginBottom: 4
          }}>{k}</div><div style={{
            fontSize: 14,
            fontWeight: 900,
            color: D,
            lineHeight: 1.2,
            marginBottom: 3
          }}>{L}</div><div style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.42)",
            lineHeight: 1.4
          }}>{R}</div></div>)}</div></div><AffiliateBanner /></div>;
}

export default Landing
