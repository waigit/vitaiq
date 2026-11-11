import { useState, useEffect, useRef } from 'react'
import { getAffiliates, getAffiliatesCached, weightedAffiliateRotation, uploadMealPhoto, saveNutritionLog, getNutritionHistory } from '../lib/supabase'
import { computeStreaks, computeWeekStats, loadCheckins, computeCheckinInsights, CHECKIN_TAGS, localDay } from '../lib/insights'
import { SessionsCard } from './Sessions'
import { HistoryNote, StreaksCard, CheckInCard, CheckinInsightsCard, ShareWeekCard, InstallHint, SyncFromIPhone } from './Extras'

import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

const T = {
  // Dark athletic theme — Gen Z / fitness-aware
  navy:'#0A0A0F',        // near black base
  navyMid:'#12121A',     // card surface
  teal:'#00FF88',        // neon green accent (primary)
  tealLight:'#00FF8818', // neon green tint bg
  green:'#00FF88',
  greenBg:'#00FF8812',
  yellow:'#FFD60A',      // electric yellow
  yellowBg:'#FFD60A12',
  red:'#FF3B5C',         // hot pink-red
  redBg:'#FF3B5C12',
  blue:'#4D9EFF',        // electric blue
  blueBg:'#4D9EFF12',
  purple:'#BF5AF2',      // neon purple
  purpleBg:'#BF5AF212',
  border:'#FFFFFF12',    // subtle glass border
  border2:'#FFFFFF20',
  muted:'#FFFFFF40',     // 40% white
  sub:'#FFFFFF70',       // 70% white
  bg:'#0A0A0F',          // dark base
  white:'#FFFFFF',
  text:'#FFFFFF'
}

// Tab-specific background themes — real Pexels athlete photos

// Dashboard UI labels by language
const DASH_LABELS = {
  EN: {
    tabs: ['Today','Readiness','Sleep','Effort','Vitals','Habits','AI Coach','Longevity','Blood Press','Nutrition'],
    upgrade: 'Upgrade', pro: 'Pro', demo: 'DEMO',
    readiness: 'Readiness Score', today: "Today's Focus",
    morning: 'Morning Briefing', alerts: 'Health Alerts',
  },
  BM: {
    tabs: ['Hari Ini','Kesediaan','Tidur','Usaha','Vital','Tabiat','Jurulatih AI','Umur Panjang','Tekanan Darah','Pemakanan'],
    upgrade: 'Naik Taraf', pro: 'Pro', demo: 'DEMO',
    readiness: 'Skor Kesediaan', today: 'Fokus Hari Ini',
    morning: 'Ringkasan Pagi', alerts: 'Amaran Kesihatan',
  },
  ZH: {
    tabs: ['今天','准备状态','睡眠','努力','健康','习惯','AI教练','长寿','血压','营养'],
    upgrade: '升级', pro: 'Pro', demo: '演示',
    readiness: '准备状态评分', today: '今日重点',
    morning: '早间简报', alerts: '健康警报',
  },
  TA: {
    tabs: ['இன்று','தயார்நிலை','தூக்கம்','முயற்சி','உடல்நலம்','பழக்கங்கள்','AI பயிற்சி','நீண்ட ஆயுள்','இரத்த அழுத்தம்','ஊட்டச்சத்து'],
    upgrade: 'மேம்படுத்து', pro: 'Pro', demo: 'டெமோ',
    readiness: 'தயார்நிலை மதிப்பெண்', today: 'இன்றைய கவனம்',
    morning: 'காலை சுருக்கம்', alerts: 'உடல்நல எச்சரிக்கை',
  },
}

const PHOTOS = {
  today:      'https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&w=900',
  readiness:  'https://images.pexels.com/photos/221241/pexels-photo-221241.jpeg?auto=compress&cs=tinysrgb&w=900',
  sleep:      'https://images.pexels.com/photos/1252869/pexels-photo-1252869.jpeg?auto=compress&cs=tinysrgb&w=900',
  effort:     'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=900',
  health:     'https://images.pexels.com/photos/4761790/pexels-photo-4761790.jpeg?auto=compress&cs=tinysrgb&w=900',
  behaviors:  'https://images.pexels.com/photos/10350694/pexels-photo-10350694.jpeg?auto=compress&cs=tinysrgb&w=900',
  ai:         'https://images.pexels.com/photos/6777231/pexels-photo-6777231.jpeg?auto=compress&cs=tinysrgb&w=900',
  longevity:  'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=900',
  bp:         'https://images.pexels.com/photos/4761786/pexels-photo-4761786.jpeg?auto=compress&cs=tinysrgb&w=900',
}

const GLOW_COLORS = {
  today:'#00FF88', readiness:'#00FF88', sleep:'#4D9EFF',
  effort:'#FFD60A', health:'#00FF88', behaviors:'#00FF88',
  ai:'#BF5AF2', longevity:'#00FF88', bp:'#4D9EFF',
}

const TAB_BG = {
  today:'#0A0A0F', readiness:'#0A0A0F', sleep:'#0A0A0F',
  effort:'#0A0A0F', health:'#0A0A0F', behaviors:'#0A0A0F',
  ai:'#0A0A0F', longevity:'#0A0A0F', bp:'#0A0A0F',
}
// Decorative SVG backgrounds per tab (athletic/health themed, behind cards)
const TabDecoration = ({tab}) => {
  const decs = {
    today: (
      <svg style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:0.6}} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {/* Heart rate wave — subtle across top */}
        <polyline points="0,200 120,200 160,120 200,280 240,200 360,200 400,80 440,320 480,200 600,200 640,150 680,250 720,200 1440,200"
          fill="none" stroke="#00FF88" strokeWidth="1.5" strokeOpacity="0.15"/>
        {/* Big circle ring — bottom right */}
        <circle cx="1300" cy="750" r="280" fill="none" stroke="#00FF88" strokeWidth="1" strokeOpacity="0.08"/>
        <circle cx="1300" cy="750" r="220" fill="none" stroke="#00FF88" strokeWidth="0.8" strokeOpacity="0.06"/>
        {/* Top left corner accent */}
        <circle cx="0" cy="0" r="200" fill="rgba(0,255,136,0.04)"/>
        {/* Diagonal line accents */}
        <line x1="200" y1="0" x2="0" y2="200" stroke="#00FF88" strokeWidth="1" strokeOpacity="0.06"/>
        <line x1="400" y1="0" x2="0" y2="400" stroke="#00FF88" strokeWidth="0.8" strokeOpacity="0.04"/>
      </svg>
    ),
    readiness: (
      <svg style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:0.6}} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {/* Rising bars — athletic chart motif */}
        {[0,1,2,3,4,5,6,7].map(i=>(
          <rect key={i} x={100+i*140} y={800-(i*60+80)} width="60" height={i*60+80}
            fill="#00FF88" fillOpacity={0.03+i*0.005} rx="4"/>
        ))}
        {/* Upward arrow accent */}
        <polyline points="80,600 80,100 130,150" fill="none" stroke="#00FF88" strokeWidth="1.5" strokeOpacity="0.08"/>
        <polyline points="80,100 30,150" fill="none" stroke="#00FF88" strokeWidth="1.5" strokeOpacity="0.08"/>
        {/* Big orb right */}
        <circle cx="1350" cy="450" r="320" fill="rgba(0,255,136,0.04)"/>
        <circle cx="1350" cy="450" r="240" fill="rgba(0,255,136,0.04)"/>
        <circle cx="1350" cy="450" r="160" fill="rgba(0,255,136,0.03)"/>
      </svg>
    ),
    sleep: (
      <svg style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:0.5}} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {/* Moon crescent top right */}
        <circle cx="1340" cy="100" r="120" fill="rgba(77,158,255,0.05)"/>
        <circle cx="1380" cy="80" r="100" fill="rgba(247,249,252,0.8)"/>
        {/* Stars scattered */}
        {[[200,80],[400,40],[600,100],[800,50],[1000,90],[300,160],[700,30],[1100,70],[150,200]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r={i%3===0?3:2} fill="#4D9EFF" fillOpacity="0.12"/>
        ))}
        {/* Gentle sine wave — sleep rhythm */}
        <path d="M0,500 Q180,380 360,500 Q540,620 720,500 Q900,380 1080,500 Q1260,620 1440,500"
          fill="none" stroke="#4D9EFF" strokeWidth="1.5" strokeOpacity="0.08"/>
        <path d="M0,550 Q180,430 360,550 Q540,670 720,550 Q900,430 1080,550 Q1260,670 1440,550"
          fill="none" stroke="#BF5AF2" strokeWidth="1" strokeOpacity="0.06"/>
        {/* Bottom orb */}
        <circle cx="200" cy="800" r="200" fill="rgba(191,90,242,0.04)"/>
      </svg>
    ),
    effort: (
      <svg style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:0.5}} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {/* Lightning bolt — energy/effort */}
        <polygon points="800,50 720,400 780,400 700,850 900,380 820,380 920,50"
          fill="rgba(255,214,10,0.05)" stroke="#FFD60A" strokeWidth="1" strokeOpacity="0.08"/>
        {/* Speed lines — athletic motion */}
        {[0,1,2,3,4].map(i=>(
          <line key={i} x1="0" y1={200+i*80} x2={300+i*30} y2={200+i*80}
            stroke="#FFD60A" strokeWidth="1" strokeOpacity={0.05-i*0.008}/>
        ))}
        {/* Track curve — athletic */}
        <ellipse cx="1200" cy="700" rx="350" ry="200" fill="none" stroke="#FFD60A" strokeWidth="2" strokeOpacity="0.06"/>
        <ellipse cx="1200" cy="700" rx="280" ry="160" fill="none" stroke="#FFD60A" strokeWidth="1" strokeOpacity="0.04"/>
        {/* Fire orb top right */}
        <circle cx="1400" cy="0" r="200" fill="rgba(220,38,38,0.04)"/>
      </svg>
    ),
    health: (
      <svg style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:0.6}} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {/* ECG/heartbeat wave across middle */}
        <polyline points="0,450 200,450 260,450 300,300 340,600 380,450 460,450 500,350 540,550 580,450 660,450 700,380 740,520 780,450 1440,450"
          fill="none" stroke="#00FF88" strokeWidth="2" strokeOpacity="0.1"/>
        {/* Cross/plus health symbol — subtle */}
        <rect x="1300" y="300" width="8" height="80" fill="#00FF88" fillOpacity="0.06" rx="4"/>
        <rect x="1270" y="330" width="68" height="8" fill="#00FF88" fillOpacity="0.06" rx="4"/>
        <rect x="180" y="100" width="6" height="60" fill="#00FF88" fillOpacity="0.07" rx="3"/>
        <rect x="155" y="125" width="56" height="6" fill="#00FF88" fillOpacity="0.07" rx="3"/>
        {/* DNA helix dots */}
        {[0,1,2,3,4,5,6,7].map(i=>(
          <g key={i}>
            <circle cx={1100+Math.sin(i*0.8)*40} cy={150+i*80} r="5" fill="#00FF88" fillOpacity="0.06"/>
            <circle cx={1100-Math.sin(i*0.8)*40} cy={150+i*80} r="5" fill="#00FF88" fillOpacity="0.05"/>
            <line x1={1100+Math.sin(i*0.8)*40} y1={150+i*80} x2={1100-Math.sin(i*0.8)*40} y2={150+i*80}
              stroke="#00FF88" strokeWidth="0.8" strokeOpacity="0.06"/>
          </g>
        ))}
      </svg>
    ),
    behaviors: (
      <svg style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:0.5}} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {/* Habit streak dots grid */}
        {[0,1,2,3,4,5,6].map(row=>[0,1,2,3,4,5,6,7,8,9,10,11,12].map(col=>(
          <circle key={`${row}-${col}`} cx={100+col*90} cy={100+row*100} r="6"
            fill={Math.random()>0.4?'#00A896':'#E5EAF0'} fillOpacity={Math.random()>0.4?0.12:0.06}/>
        )))}
        {/* Checkmark large */}
        <polyline points="1200,400 1280,500 1420,300" fill="none" stroke="#00FF88" strokeWidth="3" strokeOpacity="0.07"/>
        {/* Trend arrow */}
        <polyline points="100,750 300,680 500,690 700,620 900,580 1100,520 1300,460"
          fill="none" stroke="#00FF88" strokeWidth="2" strokeOpacity="0.08"/>
        <circle cx="1300" cy="460" r="8" fill="#00FF88" fillOpacity="0.10"/>
      </svg>
    ),
    ai: (
      <svg style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:0.45}} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {/* Neural network dots */}
        {[[200,200],[400,300],[300,500],[500,150],[700,350],[600,550],[800,200],[900,450],[1100,300],[1000,550],[1200,150],[1300,400]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="6" fill="#00FF88" fillOpacity="0.10"/>
        ))}
        {/* Neural connections */}
        {[[200,200,400,300],[400,300,300,500],[400,300,700,350],[500,150,700,350],[700,350,600,550],[700,350,800,200],[800,200,1100,300],[900,450,1100,300],[1100,300,1200,150],[1100,300,1300,400]].map(([x1,y1,x2,y2],i)=>(
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00FF88" strokeWidth="1" strokeOpacity="0.07"/>
        ))}
        {/* Sparkle accents */}
        {[[150,80],[1300,100],[100,700],[1350,750]].map(([x,y],i)=>(
          <g key={i}>
            <line x1={x-12} y1={y} x2={x+12} y2={y} stroke="#00FF88" strokeWidth="1.5" strokeOpacity="0.12"/>
            <line x1={x} y1={y-12} x2={x} y2={y+12} stroke="#00FF88" strokeWidth="1.5" strokeOpacity="0.12"/>
          </g>
        ))}
      </svg>
    ),
    longevity: (
      <svg style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:0.5}} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {/* Tree of life / growth rings */}
        {[80,160,240,320,400].map((r,i)=>(
          <circle key={i} cx="200" cy="800" r={r} fill="none" stroke="#00FF88" strokeWidth="1" strokeOpacity={0.06-i*0.008}/>
        ))}
        {/* DNA strand right side */}
        {[0,1,2,3,4,5,6,7,8,9].map(i=>(
          <g key={i}>
            <circle cx={1250+Math.sin(i*0.7)*50} cy={80+i*80} r="6" fill="#00FF88" fillOpacity="0.08"/>
            <circle cx={1250-Math.sin(i*0.7)*50} cy={80+i*80} r="6" fill="#00FF88" fillOpacity="0.06"/>
            <line x1={1250+Math.sin(i*0.7)*50} y1={80+i*80} x2={1250-Math.sin(i*0.7)*50} y2={80+i*80}
              stroke="#00FF88" strokeWidth="1" strokeOpacity="0.07"/>
          </g>
        ))}
        {/* Rising arrow — aging slower */}
        <polyline points="600,800 700,600 800,650 900,400 1000,450 1100,200"
          fill="none" stroke="#00FF88" strokeWidth="2" strokeOpacity="0.08"/>
        <circle cx="1100" cy="200" r="10" fill="#00FF88" fillOpacity="0.08"/>
      </svg>
    ),
    bp: (
      <svg style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:0.5}} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {/* Heartbeat ECG */}
        <polyline points="0,400 300,400 360,400 400,200 440,600 480,400 560,400 600,300 640,500 680,400 1440,400"
          fill="none" stroke="#00FF88" strokeWidth="2.5" strokeOpacity="0.09"/>
        {/* Blood pressure cuff circle — abstract */}
        <circle cx="1200" cy="200" r="180" fill="none" stroke="#4D9EFF" strokeWidth="2" strokeOpacity="0.06"/>
        <circle cx="1200" cy="200" r="130" fill="none" stroke="#00FF88" strokeWidth="1.5" strokeOpacity="0.05"/>
        {/* Stethoscope curve */}
        <path d="M100,600 Q150,500 200,550 Q250,600 300,500 Q350,400 400,450"
          fill="none" stroke="#00FF88" strokeWidth="2" strokeOpacity="0.07"/>
        <circle cx="100" cy="600" r="20" fill="none" stroke="#00FF88" strokeWidth="2" strokeOpacity="0.07"/>
      </svg>
    ),
  }
  return decs[tab] || null
}

// ── DEMO DATA (used when no upload) ──────────────────────────────────────────
// Minimal safe shape for nutrition-only mode — see the `d` assignment in
// Dashboard() for why this exists instead of falling back to DEMO.
const EMPTY_HEALTH = {
  meta: {}, latest: {}, monthly: {}, sleep: {}, daily: {}, alerts: [],
}
const DEMO = {
  meta:{ startDate:'2025-10-05', endDate:'2026-06-27', durationLabel:'9 months', durationMonths:9, fileName:'demo' },
  latest:{ rhr:63.8, rhrAvg:66.6, hrv:48.9, hrvBaseline:34.7, spo2:96.3, spo2Avg:96.3, spo2DipsBelow90:59,
    vo2:41.49, vo2Max:42.26, rr:12.5, rrAvg:13.4, wristTemp:35.52, wristTempBaseline:35.45,
    weight:72, readiness:78, stress:22, stressIndex:22, stressLabel:'Low',
    strain:11.4, strainAvg:9.8, sleepConsistency:72, sleepEfficiency:88,
    calorieGoal:2340, calorieGoalSource:'watch' },
  monthly:{
    rhr: [72.8,64.9,65.5,66.5,68.8,66.9,65.6,65.3,63.8].map((v,i)=>({month:['Oct\'25','Nov\'25','Dec\'25','Jan\'26','Feb\'26','Mar\'26','Apr\'26','May\'26','Jun\'26'][i],rawMonth:`202${i<3?5:6}-${['10','11','12','01','02','03','04','05','06'][i]}`,value:v})),
    hrv: [31.8,36.8,37.0,35.5,31.8,34.1,33.0,35.1,35.9].map((v,i)=>({month:['Oct\'25','Nov\'25','Dec\'25','Jan\'26','Feb\'26','Mar\'26','Apr\'26','May\'26','Jun\'26'][i],rawMonth:`202${i<3?5:6}-${['10','11','12','01','02','03','04','05','06'][i]}`,value:v})),
    vo2:  [35.26,40.62,38.76,36.61,38.22,36.72,38.75,39.03,41.35].map((v,i)=>({month:['Oct\'25','Nov\'25','Dec\'25','Jan\'26','Feb\'26','Mar\'26','Apr\'26','May\'26','Jun\'26'][i],rawMonth:`202${i<3?5:6}-${['10','11','12','01','02','03','04','05','06'][i]}`,value:v})),
    readiness:[28,72,71,58,35,50,48,62,78].map((v,i)=>({month:['Oct\'25','Nov\'25','Dec\'25','Jan\'26','Feb\'26','Mar\'26','Apr\'26','May\'26','Jun\'26'][i],rawMonth:`202${i<3?5:6}-${['10','11','12','01','02','03','04','05','06'][i]}`,value:v})),
    stress:[62,26,27,35,58,42,45,32,22].map((v,i)=>({month:['Oct\'25','Nov\'25','Dec\'25','Jan\'26','Feb\'26','Mar\'26','Apr\'26','May\'26','Jun\'26'][i],rawMonth:`202${i<3?5:6}-${['10','11','12','01','02','03','04','05','06'][i]}`,value:v})),
  },
  sleep:{
    '2026-06-14':{total:6.0,deep:0.6,rem:2.0,core:3.4,awake:0.4},
    '2026-06-15':{total:5.7,deep:1.2,rem:1.3,core:3.2,awake:0.6},
    '2026-06-16':{total:7.3,deep:0.9,rem:2.5,core:3.9,awake:0.7},
    '2026-06-17':{total:6.9,deep:1.0,rem:2.0,core:3.9,awake:0.8},
    '2026-06-18':{total:6.6,deep:0.9,rem:1.3,core:4.4,awake:0.6},
    '2026-06-19':{total:2.2,deep:0.3,rem:0.5,core:1.4,awake:0.2},
    '2026-06-20':{total:3.2,deep:0.6,rem:0.6,core:2.0,awake:0.3},
    '2026-06-21':{total:6.4,deep:1.2,rem:2.3,core:2.9,awake:0.4},
    '2026-06-22':{total:6.9,deep:1.3,rem:2.2,core:3.4,awake:0.4},
    '2026-06-23':{total:3.4,deep:0.4,rem:0.7,core:2.3,awake:0.2},
    '2026-06-24':{total:3.2,deep:0.3,rem:1.4,core:1.5,awake:0.2},
    '2026-06-25':{total:9.1,deep:2.1,rem:2.5,core:4.5,awake:0.7},
    '2026-06-26':{total:5.0,deep:0.9,rem:1.3,core:2.8,awake:0.6},
    '2026-06-27':{total:6.0,deep:1.0,rem:1.5,core:3.5,awake:0.4},
  },
  daily:{
    steps:{'2026-06-25':17033,'2026-06-26':12165,'2026-06-27':8320},
    hrv:{
      '2026-06-14':33,'2026-06-15':31,'2026-06-16':41,'2026-06-17':38,'2026-06-18':36,
      '2026-06-19':26,'2026-06-20':28,'2026-06-21':37,'2026-06-22':40,'2026-06-23':29,
      '2026-06-24':27,'2026-06-25':45,'2026-06-26':34,'2026-06-27':39,
    },
    strain:{
      '2026-05-31':9.1,'2026-06-01':7.4,'2026-06-02':10.2,'2026-06-03':6.8,'2026-06-04':8.9,
      '2026-06-05':12.0,'2026-06-06':5.5,'2026-06-07':9.4,'2026-06-08':8.1,'2026-06-09':7.0,
      '2026-06-10':10.6,'2026-06-11':6.2,'2026-06-12':9.8,'2026-06-13':7.7,
      '2026-06-14':8.2,'2026-06-15':6.5,'2026-06-16':13.1,'2026-06-17':10.4,'2026-06-18':7.8,
      '2026-06-19':15.6,'2026-06-20':4.2,'2026-06-21':9.9,'2026-06-22':11.7,'2026-06-23':5.1,
      '2026-06-24':16.8,'2026-06-25':10.9,'2026-06-26':8.6,'2026-06-27':11.4,
    }
  },
  alerts:[{type:'warning',metric:'SpO2',message:'59 readings below 90% SpO2 during sleep — discuss with doctor'}],
  habitInsights:[
    {h:'Pickleball — 8× this period',e:'+11% next-day HRV',pos:true},
    {h:'Running — 5× this period',e:'+6% next-day HRV',pos:true},
    {h:'Asleep before midnight (18 nights)',e:'+9% next-day HRV',pos:true},
    {h:'Asleep after midnight (9 nights)',e:'−7% next-day HRV',pos:false},
    {h:'Under 5hrs sleep (4 nights)',e:'−14% next-day HRV',pos:false},
  ],
  workoutTypeCounts:{Pickleball:8,Running:5,Tennis:3,Basketball:1},
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const rCol  = v => v>=67?T.green:v>=33?T.yellow:T.red
const rBg   = v => v>=67?T.greenBg:v>=33?T.yellowBg:T.redBg
const rLbl  = v => v>=67?'Great':v>=33?'Moderate':'Low'
const fmt   = (v,dp=1) => v!=null?parseFloat(v.toFixed(dp)):'-'
function relativeTime(iso){
  const then=new Date(iso)
  if(isNaN(then.getTime()))return ''
  const mins=Math.round((Date.now()-then.getTime())/60000)
  if(mins<1)return 'just now'
  if(mins<60)return `${mins}m ago`
  const hours=Math.round(mins/60)
  if(hours<24)return `${hours}h ago`
  const days=Math.round(hours/24)
  if(days<30)return `${days}d ago`
  return then.toLocaleDateString([],{month:'short',day:'numeric'})
}
const TT    = p => <Tooltip {...p} contentStyle={{background:'rgba(15,15,20,0.95)',border:'1px solid rgba(0,255,136,0.2)',borderRadius:10,fontSize:11,color:'#fff',boxShadow:'0 4px 24px rgba(0,0,0,0.6)'}}/>

function Card({children,style={}}){
  return <div style={{
    background:'rgba(18,18,26,0.90)',
    backdropFilter:'blur(20px)',
    WebkitBackdropFilter:'blur(20px)',
    borderRadius:16,
    padding:'20px',
    border:'1px solid rgba(0,255,136,0.12)',
    boxShadow:'0 4px 24px rgba(0,0,0,0.6)',
    ...style
  }}>{children}</div>
}
// ── Mobile-safe chart container ─────────────────────────────────────────
function ChartBox({height,children}){
  const boxRef = useRef(null)
  const fallbackW = () => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390
    return Math.max(200, Math.min(vw, 960) - 68) // page padding(28) + card padding(40)
  }
  const [w,setW] = useState(fallbackW)
  useEffect(()=>{
    const measure = () => {
      if (boxRef.current) {
        const cw = boxRef.current.clientWidth
        if (cw > 0) setW(cw)
      }
    }
    measure()
    const t1 = setTimeout(measure, 50)
    const t2 = setTimeout(measure, 300)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      clearTimeout(t1); clearTimeout(t2)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  },[])
  return (
    <div ref={boxRef} style={{width:'100%',overflow:'hidden'}}>
      <ResponsiveContainer width={w} height={height}>{children}</ResponsiveContainer>
    </div>
  )
}
function Label({children}){
  return <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:2,marginBottom:12,fontWeight:700}}>{children}</div>
}
function Badge({label,color,bg}){
  return <span style={{background:bg,color,fontSize:10,padding:'3px 10px',borderRadius:99,fontWeight:700}}>{label}</span>
}
function NoHealthDataGate({onBack}){
  return(
    <Card>
      <div style={{textAlign:'center',padding:'32px 16px'}}>
        <div style={{fontSize:32,marginBottom:14}}>⌚</div>
        <div style={{fontSize:15,fontWeight:800,color:'#fff',marginBottom:8}}>This needs Apple Watch data</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',lineHeight:1.6,maxWidth:280,margin:'0 auto 20px'}}>
          Readiness, sleep, effort, and vitals are all built from your Apple Watch export. Nutrition and AI Coach work right now without one.
        </div>
        <button onClick={onBack}
          style={{background:'#00FF88',color:'#000',border:'none',borderRadius:99,padding:'10px 20px',fontSize:13,fontWeight:700,cursor:'pointer'}}>
          Upload Apple Watch data
        </button>
      </div>
    </Card>
  )
}

function featureUnlockKey(feature){
  return `vitaiq_unlocked_${feature}_${new Date().toISOString().slice(0,10)}`
}
function isFeatureUnlocked(feature){
  try{ return localStorage.getItem(featureUnlockKey(feature))==='1' }catch{ return true }
}
function unlockFeature(feature){
  try{ localStorage.setItem(featureUnlockKey(feature),'1') }catch{}
}
function FeatureGate({feature,tabForAffiliate,title,children}){
  const [unlocked,setUnlocked]=useState(()=>isFeatureUnlocked(feature))
  if(unlocked)return children
  const handleClick=()=>{
    unlockFeature(feature)
    setUnlocked(true)
  }
  return(
    <Card>
      <div style={{textAlign:'center',padding:'8px 4px 4px'}}>
        <div style={{fontSize:28,marginBottom:10}}>🙏</div>
        <div style={{fontSize:15,fontWeight:800,color:'#fff',marginBottom:6}}>{title}</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',lineHeight:1.6,maxWidth:300,margin:'0 auto 18px'}}>
          VitaIQ is free forever — one tap on today's partner below keeps it that way. Unlocks {feature==='nutrition'?'Nutrition':'AI Coach'} for the rest of today.
        </div>
      </div>
      <div onClick={handleClick}>
        <AffiliateInlineCard tab={tabForAffiliate}/>
      </div>
    </Card>
  )
}
function InfoTip({text}){
  const [open,setOpen]=useState(false)
  return(
    <span style={{position:'relative',display:'inline-block',textTransform:'none',letterSpacing:'normal'}}>
      <span onClick={()=>setOpen(o=>!o)}
        style={{cursor:'pointer',fontSize:9,color:'rgba(255,255,255,0.4)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:'50%',width:13,height:13,display:'inline-flex',alignItems:'center',justifyContent:'center',marginLeft:6,verticalAlign:'middle'}}>i</span>
      {open&&(
        <div style={{position:'absolute',top:18,left:0,zIndex:20,width:230,background:'rgba(18,18,26,0.98)',border:'1px solid rgba(0,255,136,0.3)',borderRadius:10,padding:'10px 12px',fontSize:11,color:'rgba(255,255,255,0.75)',lineHeight:1.5,boxShadow:'0 4px 16px rgba(0,0,0,0.5)',fontWeight:400}}>
          {text}
        </div>
      )}
    </span>
  )
}

function DataGapNotice({needs,note,compact=false}){
  return(
    <div style={{textAlign:'center',padding:compact?'10px 6px':'24px 16px'}}>
      <div style={{fontSize:compact?20:28,marginBottom:compact?6:10,opacity:0.6}}>📋</div>
      <div style={{fontSize:compact?12:14,fontWeight:700,color:'rgba(255,255,255,0.85)',marginBottom:8}}>
        Not enough data yet
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',marginBottom:10}}>
        {needs.map(n=>(
          <span key={n} style={{fontSize:compact?10:11,padding:'3px 9px',borderRadius:99,background:'rgba(255,214,10,0.10)',border:'1px solid rgba(255,214,10,0.3)',color:'#FFD60A',fontWeight:600}}>{n}</span>
        ))}
      </div>
      <div style={{fontSize:compact?10:11,color:'rgba(255,255,255,0.4)',lineHeight:1.5,maxWidth:280,margin:'0 auto'}}>
        {note||'In Simple Health Export CSV, make sure these are checked before you export, then upload again.'}
      </div>
    </div>
  )
}
function StatBar({label,value,pct,color,note}){
  return(
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
        <span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{label}</span>
        <span style={{fontSize:12,fontWeight:700,color}}>{value}</span>
      </div>
      <div style={{background:'rgba(255,255,255,0.08)',borderRadius:99,height:4}}>
        <div style={{width:`${Math.min(100,Math.max(0,pct))}%`,height:'100%',background:color,borderRadius:99,transition:'width 0.5s',boxShadow:`0 0 8px ${color}88`}}/>
      </div>
      {note&&<div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:3}}>{note}</div>}
    </div>
  )
}
function Ring({value,max=100,size=108,stroke=10,color,label,sub}){
  const r=(size-stroke)/2,circ=2*Math.PI*r,fill=(value/max)*circ
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
      <svg width={size} height={size} style={{filter:`drop-shadow(0 0 8px ${color}66)`}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke='rgba(255,255,255,0.06)' strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{transition:'stroke-dasharray 0.6s ease'}}/>
        <text x={size/2} y={size/2-2} textAnchor="middle" fill={color} fontSize={22} fontWeight={800} fontFamily="Inter,system-ui">{value}</text>
        {sub&&<text x={size/2} y={size/2+14} textAnchor="middle" fill='rgba(255,255,255,0.4)' fontSize={9} fontFamily="Inter,system-ui">{sub}</text>}
      </svg>
      <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:1.5,fontWeight:700}}>{label}</div>
    </div>
  )
}

const BREATH_PHASES=[
  {key:'in',   label:'Breathe In',  dur:4, color:T.teal,   to:100},
  {key:'hold', label:'Hold',        dur:4, color:T.yellow, to:100},
  {key:'out',  label:'Breathe Out', dur:6, color:T.blue,   to:0},
]
function Breathwork(){
  const [running,setRunning]=useState(false)
  const [phaseIdx,setPhaseIdx]=useState(0)
  const [pct,setPct]=useState(0)
  const [secLeft,setSecLeft]=useState(BREATH_PHASES[0].dur)
  const [cycles,setCycles]=useState(0)
  const phase=BREATH_PHASES[phaseIdx]

  useEffect(()=>{
    if(!running)return
    setPct(phase.to)
    setSecLeft(phase.dur)
    const tick=setInterval(()=>setSecLeft(s=>Math.max(0,s-1)),1000)
    const advance=setTimeout(()=>{
      setPhaseIdx(i=>{
        const next=(i+1)%BREATH_PHASES.length
        if(next===0)setCycles(c=>c+1)
        return next
      })
    },phase.dur*1000)
    return()=>{clearInterval(tick);clearTimeout(advance)}
  },[running,phaseIdx])

  const toggle=()=>{
    if(running){setRunning(false)}
    else{setPhaseIdx(0);setPct(0);setCycles(0);setRunning(true)}
  }

  const size=120,r=50,circ=2*Math.PI*r
  const displayColor=running?phase.color:T.border2
  const displayLabel=running?phase.label:'Ready'
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke='rgba(255,255,255,0.06)' strokeWidth={8}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={displayColor} strokeWidth={8}
          strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{transition:running?`stroke-dasharray ${phase.dur}s linear, stroke 0.3s linear`:'none'}}/>
        <text x={size/2} y={size/2-2} textAnchor="middle" fill={displayColor} fontSize={13} fontWeight={700} fontFamily="Inter,system-ui">{displayLabel}</text>
        <text x={size/2} y={size/2+16} textAnchor="middle" fill={T.muted} fontSize={11} fontFamily="Inter,system-ui">{running?secLeft+'s':'4 · 4 · 6'}</text>
      </svg>
      <div style={{fontSize:12,color:T.sub}}>Cycles: <b style={{color:T.teal}}>{cycles}</b></div>
      <button onClick={toggle}
        style={{padding:'9px 22px',borderRadius:99,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:running?T.red:T.teal,color:'#fff'}}>
        {running?'Stop':'Start Session'}
      </button>
    </div>
  )
}

const TABS=[
  {id:'today',icon:'⚡',labelKey:0,free:true},
  {id:'readiness',icon:'💚',labelKey:1,free:true},
  {id:'sleep',icon:'😴',labelKey:2,free:true},
  {id:'effort',icon:'🔥',labelKey:3,free:true},
  {id:'health',icon:'🫀',labelKey:4,free:true},
  {id:'behaviors',icon:'📊',labelKey:5,free:true},
  {id:'ai',icon:'✨',labelKey:6,free:false},
  {id:'longevity',icon:'🧬',labelKey:7,free:false},
  {id:'bp',icon:'💉',labelKey:8,free:false},
  {id:'nutrition',icon:'🍽️',labelKey:9,free:true},
]
const LOCKED=[]

const AFFILIATE_ITEMS = [{"icon": "🌿", "label": "Health Natural Life", "sub": "Natural health supplements", "url": "https://s.shopee.com.my/3qLGjujtTt", "commission": "24%", "color": "#00FF88"}, {"icon": "💊", "label": "Nova Health", "sub": "Premium health products", "url": "https://s.shopee.com.my/3B5ZwgmQpp", "commission": "21%", "color": "#00FF88"}, {"icon": "🏥", "label": "Health Origins", "sub": "Trusted health store", "url": "https://s.shopee.com.my/50XE83fS7E", "commission": "19%", "color": "#00FF88"}, {"icon": "💪", "label": "Health Master MY", "sub": "Workout & recovery supplements", "url": "https://s.shopee.com.my/1VxLxcsmDP", "commission": "16%", "color": "#4D9EFF"}, {"icon": "❤️", "label": "HAPPY HEALTH MALAYSIA", "sub": "Complete health range", "url": "https://s.shopee.com.my/2qSjY4nhVn", "commission": "13%", "color": "#FFD60A"}, {"icon": "🩺", "label": "Female Health", "sub": "Women's health & wellness", "url": "https://s.shopee.com.my/40egwDjG98", "commission": "13%", "color": "#FF3B5C"}, {"icon": "🏠", "label": "Health Home", "sub": "Home health essentials", "url": "https://s.shopee.com.my/3g1qXbkWoq", "commission": "12%", "color": "#4D9EFF"}, {"icon": "🥗", "label": "Healthy Snacks Malaysia", "sub": "Healthy snacks & nutrition", "url": "https://s.shopee.com.my/4VaxX8hM8D", "commission": "11%", "color": "#FFD60A"}, {"icon": "⚗️", "label": "Health Supplements Store MY", "sub": "Vitamins & supplements", "url": "https://s.shopee.com.my/1qaCMErVXR", "commission": "9%", "color": "#BF5AF2"}, {"icon": "🩻", "label": "Health@Care", "sub": "Healthcare essentials", "url": "https://s.shopee.com.my/4fuNjRginC", "commission": "9%", "color": "#BF5AF2"}, {"icon": "🌸", "label": "Malaysia Anshenyue Healthcare", "sub": "Traditional health products", "url": "https://s.shopee.com.my/2g9JLloKqk", "commission": "9%", "color": "#BF5AF2"}, {"icon": "🔒", "label": "HealthVault.my", "sub": "Trusted health products", "url": "https://s.shopee.com.my/1LdvlJtPYM", "commission": "8%", "color": "#4D9EFF"}, {"icon": "✨", "label": "TY Healthy Store", "sub": "Health essentials", "url": "https://s.shopee.com.my/5AqeKMeomH", "commission": "7%", "color": "#FFD60A"}, {"icon": "🌺", "label": "Health Freedom For All", "sub": "Health & wellness store", "url": "https://s.shopee.com.my/3ViQLIlA9r", "commission": "8%", "color": "#00FF88"}, {"icon": "🐻", "label": "Little Bear Healthy Family", "sub": "Family health products", "url": "https://s.shopee.com.my/30m9kNn4Am", "commission": "8%", "color": "#FFD60A"}, {"icon": "💚", "label": "healthylife85jn.my", "sub": "Healthy lifestyle products", "url": "https://s.shopee.com.my/4LHXKphzTA", "commission": "6%", "color": "#00FF88"}, {"icon": "🏡", "label": "aushealthwarehouseks.my", "sub": "Health warehouse", "url": "https://s.shopee.com.my/4qDnvkg5SF", "commission": "6%", "color": "#4D9EFF"}, {"icon": "💊", "label": "SR Health & Beauty", "sub": "Health & beauty", "url": "https://s.shopee.com.my/2BD2kqqErT", "commission": "4%", "color": "#BF5AF2"}, {"icon": "🏥", "label": "dellabeauty and health", "sub": "Beauty & health", "url": "https://s.shopee.com.my/3LP08zlnUo", "commission": "8%", "color": "#FF3B5C"}, {"icon": "💊", "label": "KK Health Pharmacy", "sub": "Trusted pharmacy", "url": "https://s.shopee.com.my/1gGm9vs8sO", "commission": "1%", "color": "#4D9EFF"}]

const INLINE_AFF = {
  today:    {icon:'💊',label:'Nova Health',badge:'up to 21%',sub:'Premium health supplements for your daily vitals',url:'https://s.shopee.com.my/3B5ZwgmQpp',color:'#00FF88'},
  readiness:{icon:'🌿',label:'Health Natural Life',badge:'up to 24%',sub:'Natural supplements to support HRV & recovery',url:'https://s.shopee.com.my/3qLGjujtTt',color:'#00FF88'},
  sleep:    {icon:'🌿',label:'Health Natural Life',badge:'up to 24%',sub:'Natural sleep & recovery supplements',url:'https://s.shopee.com.my/3qLGjujtTt',color:'#4D9EFF'},
  effort:   {icon:'💪',label:'Health Master MY',badge:'up to 16%',sub:'Workout supplements for your high-readiness days',url:'https://s.shopee.com.my/1VxLxcsmDP',color:'#FFD60A'},
  health:   {icon:'🏥',label:'Health Origins',badge:'up to 19%',sub:'Cardiovascular & heart health essentials',url:'https://s.shopee.com.my/50XE83fS7E',color:'#00FF88'},
  behaviors:{icon:'🥗',label:'Healthy Snacks Malaysia',badge:'up to 11%',sub:'Healthy snacks to support your daily wellness habits',url:'https://s.shopee.com.my/4VaxX8hM8D',color:'#FFD60A'},
  ai:       {icon:'⚗️',label:'Health Supplements Store MY',badge:'up to 9%',sub:'Omega-3, Magnesium & recovery essentials',url:'https://s.shopee.com.my/1qaCMErVXR',color:'#BF5AF2'},
  longevity:{icon:'🏥',label:'Health Origins',badge:'up to 19%',sub:'Longevity & anti-ageing health supplements',url:'https://s.shopee.com.my/50XE83fS7E',color:'#00FF88'},
  bp:       {icon:'💊',label:'Nova Health',badge:'up to 21%',sub:'Blood pressure & cardiovascular health products',url:'https://s.shopee.com.my/3B5ZwgmQpp',color:'#00FF88'},
  nutrition:{icon:'🥗',label:'Healthy Snacks Malaysia',badge:'up to 11%',sub:'Healthy snacks & meal-prep essentials',url:'https://s.shopee.com.my/4VaxX8hM8D',color:'#FFD60A'},
}

const AI_AFF_ITEMS = [
  {icon:'💪',label:'Health Master MY',sub:'Workout & recovery supplements',url:'https://s.shopee.com.my/1VxLxcsmDP',color:'#BF5AF2'},
  {icon:'🌿',label:'Health Natural Life',sub:'Natural HRV & recovery support',url:'https://s.shopee.com.my/3qLGjujtTt',color:'#BF5AF2'},
  {icon:'🏥',label:'Health Origins',sub:'Cardiovascular health essentials',url:'https://s.shopee.com.my/50XE83fS7E',color:'#BF5AF2'},
  {icon:'⚗️',label:'Health Supplements Store MY',sub:'Omega-3, Magnesium & vitamins',url:'https://s.shopee.com.my/1qaCMErVXR',color:'#BF5AF2'},
  {icon:'❤️',label:'HAPPY HEALTH MALAYSIA',sub:'Complete health range',url:'https://s.shopee.com.my/2qSjY4nhVn',color:'#BF5AF2'},
]

function resizeImageFile(file, maxDim = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim }
        else if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function analyzeFoodPhoto(dataUrl) {
  const res = await fetch('/api/analyze-food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl: dataUrl }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Analysis failed')
  return (data.items || []).map((it, i) => ({
    id: `${Date.now()}-${i}`,
    name: it.name,
    portionLabel: it.portion_label || '1 serving',
    scale: 1,
    baseCalories: it.calories || 0,
    baseProtein: it.protein_g || 0,
    baseCarbs: it.carbs_g || 0,
    baseFat: it.fat_g || 0,
    confidence: it.confidence ?? null,
    manual: false,
  }))
}

const NUTRI_STORAGE_KEY = 'vitaiq_nutrition_log_v1'
const NUTRI_LOCAL_RETENTION_DAYS = 35
function localDateKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function pruneOldNutriDays(all) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - NUTRI_LOCAL_RETENTION_DAYS)
  const cutoffKey = localDateKey(cutoff)
  const pruned = {}
  for (const [k, v] of Object.entries(all)) { if (k >= cutoffKey) pruned[k] = v }
  return pruned
}
function loadNutriLogForToday() {
  try {
    const all = JSON.parse(localStorage.getItem(NUTRI_STORAGE_KEY) || '{}')
    return all[localDateKey()] || []
  } catch {
    return []
  }
}
function saveNutriLogForToday(log) {
  try {
    const all = pruneOldNutriDays(JSON.parse(localStorage.getItem(NUTRI_STORAGE_KEY) || '{}'))
    all[localDateKey()] = log
    localStorage.setItem(NUTRI_STORAGE_KEY, JSON.stringify(all))
  } catch {
  }
}

function scaledNutrition(item) {
  return {
    calories: Math.round(item.baseCalories * item.scale),
    protein: Math.round(item.baseProtein * item.scale),
    carbs: Math.round(item.baseCarbs * item.scale),
    fat: Math.round(item.baseFat * item.scale),
  }
}

function MacroBar({label,grams,color,maxGrams}){
  const pct=Math.min(100,(grams/maxGrams)*100)
  return(
    <div style={{flex:1,minWidth:70}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,0.70)',marginBottom:4}}>
        <span>{label}</span><span style={{fontWeight:700,color:'#fff'}}>{grams}g</span>
      </div>
      <div style={{background:'rgba(255,255,255,0.08)',borderRadius:99,height:4}}>
        <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:99,transition:'width 0.4s'}}/>
      </div>
    </div>
  )
}

function FoodItemCard({item,onUpdateScale,onUpdateName,onRemove}){
  const s=scaledNutrition(item)
  return(
    <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:16,marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:12}}>
        <div style={{flex:1}}>
          <input value={item.name} onChange={e=>onUpdateName(item.id,e.target.value)}
            style={{background:'transparent',border:'none',outline:'none',color:'#fff',fontSize:15,fontWeight:700,width:'100%',padding:0}}/>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.70)'}}>{item.portionLabel}</span>
            {item.manual?(
              <span style={{fontSize:9,padding:'2px 7px',borderRadius:99,background:'rgba(77,158,255,0.15)',color:'#4D9EFF',fontWeight:700}}>MANUAL</span>
            ):item.confidence!=null?(
              <span style={{fontSize:9,padding:'2px 7px',borderRadius:99,
                background:item.confidence>=70?'rgba(0,255,136,0.12)':'rgba(255,214,10,0.12)',
                color:item.confidence>=70?'#00FF88':'#FFD60A',fontWeight:700}}>{item.confidence}% MATCH</span>
            ):null}
          </div>
        </div>
        <button onClick={()=>onRemove(item.id)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',padding:4,fontSize:16}}>✕</button>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <span style={{fontSize:20,fontWeight:900,color:'#FFD60A'}}>{s.calories}</span>
        <span style={{fontSize:11,color:'rgba(255,255,255,0.70)'}}>kcal at {item.scale.toFixed(2)}×</span>
      </div>
      <div style={{marginBottom:12}}>
        <input type="range" min={0.25} max={2.5} step={0.05} value={item.scale}
          onChange={e=>onUpdateScale(item.id,parseFloat(e.target.value))}
          style={{width:'100%',accentColor:'#00FF88'}}/>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'rgba(255,255,255,0.4)'}}>
          <span>0.25×</span><span>1× (as photographed)</span><span>2.5×</span>
        </div>
      </div>
      <div style={{display:'flex',gap:12}}>
        <MacroBar label="Protein" grams={s.protein} color="#4D9EFF" maxGrams={60}/>
        <MacroBar label="Carbs" grams={s.carbs} color="#FFD60A" maxGrams={100}/>
        <MacroBar label="Fat" grams={s.fat} color="#BF5AF2" maxGrams={50}/>
      </div>
    </div>
  )
}

function AddFoodItemForm({onAdd,onCancel}){
  const [form,setForm]=useState({name:'',portionLabel:'1 serving',calories:'',protein:'',carbs:'',fat:''})
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}))
  const canSubmit=form.name.trim()&&form.calories!==''
  const inputStyle={background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.20)',borderRadius:8,padding:'8px 10px',color:'#fff',fontSize:13,outline:'none',width:'100%'}
  return(
    <div style={{background:'rgba(255,255,255,0.03)',border:'1px dashed rgba(255,255,255,0.20)',borderRadius:14,padding:16,marginBottom:12}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
        <input placeholder="Dish name" value={form.name} onChange={set('name')} style={{...inputStyle,gridColumn:'1 / -1'}}/>
        <input placeholder="Portion (e.g. 1 bowl)" value={form.portionLabel} onChange={set('portionLabel')} style={{...inputStyle,gridColumn:'1 / -1'}}/>
        <input placeholder="Calories" type="number" value={form.calories} onChange={set('calories')} style={inputStyle}/>
        <input placeholder="Protein (g)" type="number" value={form.protein} onChange={set('protein')} style={inputStyle}/>
        <input placeholder="Carbs (g)" type="number" value={form.carbs} onChange={set('carbs')} style={inputStyle}/>
        <input placeholder="Fat (g)" type="number" value={form.fat} onChange={set('fat')} style={inputStyle}/>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        <button onClick={onCancel} style={{background:'none',border:'none',color:'rgba(255,255,255,0.70)',fontSize:12,cursor:'pointer',padding:'8px 12px'}}>Cancel</button>
        <button disabled={!canSubmit} onClick={()=>canSubmit&&onAdd({
            id:`manual-${Date.now()}`,name:form.name,portionLabel:form.portionLabel||'1 serving',scale:1,
            baseCalories:parseFloat(form.calories)||0,baseProtein:parseFloat(form.protein)||0,
            baseCarbs:parseFloat(form.carbs)||0,baseFat:parseFloat(form.fat)||0,confidence:null,manual:true,
          })}
          style={{background:canSubmit?'#00FF88':'rgba(255,255,255,0.08)',color:canSubmit?'#000':'rgba(255,255,255,0.4)',
            border:'none',borderRadius:99,padding:'8px 16px',fontSize:12,fontWeight:700,cursor:canSubmit?'pointer':'default'}}>
          Add item
        </button>
      </div>
    </div>
  )
}

function useAffiliatePool(fallback){
  const [items,setItems]=useState(fallback)
  useEffect(()=>{
    getAffiliatesCached().then(rows=>{
      if(rows&&rows.length>0){
        const normalized=rows.map(r=>({icon:r.icon,label:r.name,sub:'',url:r.url,color:r.color||'#00FF88'}))
        setItems(weightedAffiliateRotation(normalized))
      }
    }).catch(()=>{})
  },[])
  return items
}

function AffiliateBanner() {
  const [idx, setIdx] = useState(0)
  const items = useAffiliatePool(AFFILIATE_ITEMS)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i+1) % items.length), 15000)
    return () => clearInterval(t)
  }, [items.length])
  const item = items[idx % items.length]
  return (
    <div style={{position:'relative',zIndex:5,flexShrink:0,background:'rgba(10,10,15,0.88)',backdropFilter:'blur(12px)',borderTop:'1px solid rgba(255,255,255,0.07)',padding:'8px 16px',display:'flex',alignItems:'center',gap:12}}>
      <div style={{fontSize:9,color:'rgba(255,255,255,0.28)',textTransform:'uppercase',letterSpacing:1.5,flexShrink:0}}>Sponsored</div>
      <span style={{fontSize:20,flexShrink:0}}>{item.icon}</span>
      <div style={{flex:1,overflow:'hidden'}}>
        <div style={{fontSize:12,fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.label}</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.50)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.sub} · Shopee MY</div>
      </div>
      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,padding:'5px 13px',borderRadius:99,background:item.color,color:'#000',fontSize:10,fontWeight:800,textDecoration:'none'}}>Shop →</a>
    </div>
  )
}

function AffiliateInlineCard({tab}) {
  const fallback=[INLINE_AFF[tab]||INLINE_AFF.today]
  const pool=useAffiliatePool(fallback)
  const tabSeed=['today','readiness','sleep','effort','health','behaviors','longevity','bp','nutrition','ai'].indexOf(tab)
  const item=pool[Math.max(0,tabSeed)%pool.length]||pool[0]
  return (
    <div style={{background:`linear-gradient(135deg,${item.color}0d 0%,rgba(77,158,255,0.05) 100%)`,border:`1px solid ${item.color}2e`,borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
      <span style={{fontSize:26,flexShrink:0}}>{item.icon}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:8,color:item.color,textTransform:'uppercase',letterSpacing:1.5,fontWeight:700,marginBottom:3}}>Recommended · Shopee MY</div>
        <div style={{fontSize:13,fontWeight:800,color:'#fff',marginBottom:2}}>
          {item.label}
        </div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.50)'}}>{item.sub}</div>
      </div>
      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,padding:'8px 16px',borderRadius:99,background:item.color,color:'#000',fontSize:11,fontWeight:800,textDecoration:'none'}}>View →</a>
    </div>
  )
}

function AffiliateAICard({msgIndex=0}) {
  const pool=useAffiliatePool(AI_AFF_ITEMS)
  const item = pool[msgIndex % pool.length]
  return (
    <div style={{background:'rgba(191,90,242,0.06)',border:'1px solid rgba(191,90,242,0.18)',borderRadius:10,padding:'10px 12px',display:'flex',alignItems:'center',gap:10,marginTop:8}}>
      <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
      <div style={{flex:1,overflow:'hidden'}}>
        <div style={{fontSize:7,color:'#BF5AF2',textTransform:'uppercase',letterSpacing:1,fontWeight:700,marginBottom:2}}>Related · Shopee MY</div>
        <div style={{fontSize:11,fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.label}</div>
        <div style={{fontSize:9,color:'rgba(255,255,255,0.45)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.sub}</div>
      </div>
      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,padding:'5px 11px',borderRadius:99,background:'#BF5AF2',color:'#fff',fontSize:9,fontWeight:800,textDecoration:'none'}}>Shop →</a>
    </div>
  )
}


export default function Dashboard({healthData,onBack,uploadCount=0,freeLimit=5,showLimitModal=false,onDismissLimit,lang='EN',onLangChange,nutritionOnly=false,initialTab='today',onClearHistory}){
  const d = nutritionOnly ? EMPTY_HEALTH : (healthData || DEMO)
  const l = d.latest
  const m = d.monthly
  const isDemo = !healthData && !nutritionOnly

  const [tab,setTab]=useState(initialTab)
  const hasHealthData = !nutritionOnly
  const [aiMsgCount,setAiMsgCount]=useState(()=>{
    return parseInt(localStorage.getItem('vitaiq_ai_msgs')||'0')
  })
  const [showCoffee,setShowCoffee]=useState(false)
  const [vitalsOpen,setVitalsOpen]=useState('hrv')

  const [nutriPhoto,setNutriPhoto]=useState(null)
  const [nutriAnalyzing,setNutriAnalyzing]=useState(false)
  const [nutriError,setNutriError]=useState(null)
  const [nutriItems,setNutriItems]=useState([])
  const [nutriShowAddForm,setNutriShowAddForm]=useState(false)
  const [nutriLog,setNutriLog]=useState(loadNutriLogForToday)
  useEffect(()=>{ saveNutriLogForToday(nutriLog) },[nutriLog])
  const nutriFileRef=useRef()

  const nutriDayRef=useRef(localDateKey())
  useEffect(()=>{
    const checkDay=()=>{
      const today=localDateKey()
      if(today!==nutriDayRef.current){
        nutriDayRef.current=today
        setNutriLog(loadNutriLogForToday())
      }
    }
    const t=setInterval(checkDay,60000)
    document.addEventListener('visibilitychange',checkDay)
    return()=>{clearInterval(t);document.removeEventListener('visibilitychange',checkDay)}
  },[])

  const [nutriHistory,setNutriHistory]=useState(null)
  const [nutriExpandedDate,setNutriExpandedDate]=useState(null)
  useEffect(()=>{
    if(tab==='nutrition'&&nutriHistory===null){
      getNutritionHistory(30).then(setNutriHistory)
    }
  },[tab,nutriHistory])

  const handleNutriFile=async(file)=>{
    if(!file)return
    setNutriError(null)
    setNutriItems([])
    try{
      const dataUrl=await resizeImageFile(file)
      setNutriPhoto(dataUrl)
      setNutriAnalyzing(true)
      const found=await analyzeFoodPhoto(dataUrl)
      setNutriItems(found)
      if(found.length===0)setNutriError("Couldn't identify any food in that photo — add items manually below.")
    }catch(e){
      setNutriError(`Analysis failed: ${e.message||'unknown error'} — check the netlify dev terminal for details, or add items manually below.`)
    }
    setNutriAnalyzing(false)
  }
  const nutriUpdateScale=(id,scale)=>setNutriItems(its=>its.map(it=>it.id===id?{...it,scale}:it))
  const nutriUpdateName=(id,name)=>setNutriItems(its=>its.map(it=>it.id===id?{...it,name}:it))
  const nutriRemoveItem=id=>setNutriItems(its=>its.filter(it=>it.id!==id))
  const nutriAddManual=item=>{setNutriItems(its=>[...its,item]);setNutriShowAddForm(false)}
  const nutriCurrentTotals=nutriItems.reduce((acc,it)=>{
    const s=scaledNutrition(it)
    return{calories:acc.calories+s.calories,protein:acc.protein+s.protein,carbs:acc.carbs+s.carbs,fat:acc.fat+s.fat}
  },{calories:0,protein:0,carbs:0,fat:0})
  const [nutriSaving,setNutriSaving]=useState(false)
  const nutriLogMeal=async()=>{
    if(nutriItems.length===0)return
    setNutriSaving(true)
    const localEntry={id:Date.now(),time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),items:nutriItems,totals:nutriCurrentTotals,photo:nutriPhoto}
    setNutriLog(log=>[...log,localEntry])
    setNutriPhoto(null); setNutriItems([]); setNutriError(null)
    try{
      const{publicUrl,path}=localEntry.photo?await uploadMealPhoto(localEntry.photo):{publicUrl:null,path:null}
      await saveNutritionLog({logDate:localDateKey(),items:localEntry.items,totals:localEntry.totals,photoUrl:publicUrl,photoPath:path})
      setNutriHistory(null)
    }catch(e){ console.warn('nutrition sync failed:',e.message) }
    setNutriSaving(false)
  }
  const nutriReset=()=>{setNutriPhoto(null);setNutriItems([]);setNutriError(null);setNutriShowAddForm(false)}
  const nutriDayTotals=nutriLog.reduce((acc,m)=>({
    calories:acc.calories+m.totals.calories,protein:acc.protein+m.totals.protein,
    carbs:acc.carbs+m.totals.carbs,fat:acc.fat+m.totals.fat,
  }),{calories:0,protein:0,carbs:0,fat:0})
  const NUTRI_GOAL_KEY='vitaiq_calorie_goal_override'
  const [nutriGoalOverride,setNutriGoalOverride]=useState(()=>{
    try{const v=localStorage.getItem(NUTRI_GOAL_KEY);return v?parseInt(v,10):null}catch{return null}
  })
  const [nutriEditingGoal,setNutriEditingGoal]=useState(false)
  const nutriSuggestedGoal=l.calorieGoal||null
  const NUTRI_GOAL = nutriGoalOverride ?? nutriSuggestedGoal ?? 2000
  const nutriGoalLabel = nutriGoalOverride!=null?'Set by you':nutriSuggestedGoal?(l.calorieGoalSource==='watch'?'From your Apple Watch activity':'Estimated from your weight + activity'):'Default — connect Apple Watch or set your own'
  const saveNutriGoal=(val)=>{
    const n=parseInt(val,10)
    if(!n||n<800||n>6000)return
    setNutriGoalOverride(n)
    try{localStorage.setItem(NUTRI_GOAL_KEY,String(n))}catch{}
    setNutriEditingGoal(false)
  }
  const resetNutriGoalToSuggested=()=>{
    setNutriGoalOverride(null)
    try{localStorage.removeItem(NUTRI_GOAL_KEY)}catch{}
    setNutriEditingGoal(false)
  }
  const nutriGoalPct=Math.min(100,(nutriDayTotals.calories/NUTRI_GOAL)*100)

  const dl = DASH_LABELS[lang]||DASH_LABELS['EN']
  const greet = new Date().getHours()<12?'morning':'afternoon'
  const initMsg = nutritionOnly
    ? "You haven't connected an Apple Watch, so I can't see readiness or sleep data yet — but I can help with nutrition. Log a meal and ask me anything about it!"
    : isDemo
    ? 'This is demo data — upload your Apple Watch ZIP to see your personal health insights.'
    : 'Your data spans '+d.meta.durationLabel+' ('+d.meta.startDate+' to '+d.meta.endDate+'). Readiness: '+l.readiness+'/100. What would you like to know?'
  const [chat,setChat]=useState([{role:'ai',text:'Good '+greet+'! '+initMsg}])
  const [askInput,setAskInput]=useState('')
  const [chatLoading,setChatLoading]=useState(false)
  const chatRef=useRef()

  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight},[chat])

  const AI_FREE_LIMIT = 5

  const handleAsk = async (override) => {
    const askText = typeof override === 'string' ? override : askInput
    if (!askText.trim()) return
    if (aiMsgCount >= AI_FREE_LIMIT) {
      setShowCoffee(true)
      return
    }
    const newCount = aiMsgCount + 1
    setAiMsgCount(newCount)
    localStorage.setItem('vitaiq_ai_msgs', String(newCount))
    const msg = askText
    setChat(h=>[...h,{role:'user',text:msg}])
    setAskInput(''); setChatLoading(true)
    try {
      const res = await fetch('/api/chat',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          system:`You are VitaIQ AI Coach. Be concise (2-3 sentences), warm, and data-specific.
User data: ${nutritionOnly?`This person has NOT connected an Apple Watch — you have NO readiness, sleep, HRV, RHR, strain, vitals, or workout data for them. Do not invent or estimate any of these. Only discuss nutrition (below) and general wellness advice. If asked about readiness/sleep/workouts/etc., tell them that needs an Apple Watch export and point them to the upload option.
- Today's nutrition: ${nutriLog.length===0?'nothing logged yet today':`${nutriDayTotals.calories} kcal so far (protein ${nutriDayTotals.protein}g, carbs ${nutriDayTotals.carbs}g, fat ${nutriDayTotals.fat}g) across meals: ${nutriLog.map(m=>m.items.map(i=>i.name).join('+')).join(', ')}`} — daily goal ${NUTRI_GOAL} kcal, ${Math.max(0,NUTRI_GOAL-nutriDayTotals.calories)} kcal remaining today`:isDemo?'DEMO MODE — no real data uploaded yet':`
- Date range: ${d.meta.startDate} to ${d.meta.endDate} (${d.meta.durationLabel})
- RHR: ${l.rhr} bpm (avg ${l.rhrAvg})
- HRV: ${l.hrv} ms (baseline ${l.hrvBaseline} ms)
- SpO2: ${l.spo2}% (avg ${l.spo2Avg}%, dips below 90%: ${l.spo2DipsBelow90})
- VO2 Max: ${l.vo2} mL/kg/min (best: ${l.vo2Max})
- Resp Rate: ${l.rr} br/min
- Wrist Temp: ${l.wristTemp}°C
- Readiness: ${l.readiness}/100
- Stress Index: ${l.stressIndex} (${l.stressLabel}) — derived from HRV and resting HR vs your own baseline
- Strain (today): ${l.strain}/21 — derived from active energy + exercise minutes vs your own daily average
- Sleep Consistency: ${l.sleepConsistency}/100 — how stable your bedtime/wake time have been over the last 14 nights
- Sleep Efficiency: ${l.sleepEfficiency}% — time actually asleep vs time in bed
- Sleep need tonight: ${sleepPlan?`${sleepPlan.tonight} hrs (${sleepPlan.baseSource==='personal'?`personal baseline ${sleepPlan.base}h learned from their best-recovery (high-HRV) nights`:sleepPlan.baseSource==='duration'?`personal baseline ${sleepPlan.base}h from their longest full nights`:'default 7.5h baseline, not enough nights yet'}${sleepPlan.strainExtra>0?` + ${sleepPlan.strainExtra}h for yesterday's effort`:''}); sleep debt over last ${sleepPlan.nightsInDebt} recorded nights: ${sleepPlan.debt} hrs`:'no sleep data'}
- Training load (acute:chronic ratio, 7-day vs 28-day avg strain): ${trainingLoad&&!trainingLoad.insufficient?`${trainingLoad.ratio} — ${trainingLoad.zone} (7-day ${trainingLoad.acute}, 28-day ${trainingLoad.chronic}). 0.8–1.3 is the sweet spot; >1.5 is a load spike linked to overuse injury`:'not enough strain history (needs ~3 weeks)'}
- Streaks (as of ${d.meta.endDate}): ${streaks.sleep?`7h+ sleep ${streaks.sleep.current} nights (best ${streaks.sleep.best})`:'no sleep data'}; ${streaks.steps?`${streaks.steps.goal} steps ${streaks.steps.current} days (best ${streaks.steps.best})`:''}; ${streaks.activeWeeks?`3+ workout weeks ${streaks.activeWeeks.current} (this week ${streaks.activeWeeks.thisWeek} workout days)`:''}
- Self-reported check-ins (things the watch can't see; tag on day D affects HRV on D+1): ${(()=>{const c=loadCheckins();const recent=Object.keys(c).sort().slice(-7);const names=id=>(CHECKIN_TAGS.find(t=>t.id===id)||{}).label||id;const ins=computeCheckinInsights(c,d.daily?.hrv||{});return (recent.length?recent.map(k=>`${k}: ${c[k].length?c[k].map(names).join(', '):'nothing notable'}`).join('; '):'none logged')+(ins.items.length?`. Personal patterns: ${ins.items.map(i=>`${i.label} ${i.pct>0?'+':''}${i.pct}% next-day HRV (${i.n} days)`).join(', ')}`:'')})()}
- Blood pressure: ${l.bpSystolic!=null?`${Math.round(l.bpSystolic)}/${Math.round(l.bpDiastolic)} mmHg from a cuff synced to Apple Health`:'no readings — Apple Watch cannot measure BP; never estimate or invent a BP number'}
- Workout sessions in this export: ${d.workoutTypeCounts&&Object.keys(d.workoutTypeCounts).length?Object.entries(d.workoutTypeCounts).map(([type,count])=>`${type} ×${count}`).join(', '):'no workout data found in this export (Workouts may not have been included when exporting from Simple Health Export CSV)'}
- Recent habit/workout patterns: ${d.habitInsights&&d.habitInsights.length?d.habitInsights.map(h=>`${h.h} (${h.e})`).join('; '):'not enough data yet for pattern insights'}
- Today's nutrition: ${nutriLog.length===0?'nothing logged yet today':`${nutriDayTotals.calories} kcal so far (protein ${nutriDayTotals.protein}g, carbs ${nutriDayTotals.carbs}g, fat ${nutriDayTotals.fat}g) across meals: ${nutriLog.map(m=>m.items.map(i=>i.name).join('+')).join(', ')}`} — daily goal ${NUTRI_GOAL} kcal, ${Math.max(0,NUTRI_GOAL-nutriDayTotals.calories)} kcal remaining today`}

If — and only if — the person describes a specific meal or food they just ate that isn't already in the logged meals above, do this: estimate calories and macros per item, mention them in your reply as normal, THEN end your entire response with a hidden marker on its own line in exactly this format (this line is stripped before they see it, so never refer to it in your visible text, and never explain that you're adding it):
<!--LOG_MEAL:{"items":[{"name":"...","portion_label":"...","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}]}-->
For every other kind of question — workouts, sleep, readiness, general advice, or anything that isn't describing a specific food they just ate — do NOT include this marker at all, not even with an empty items array. If in doubt, leave it out entirely.`,
          messages:[...chat.map(x=>({role:x.role==='ai'?'assistant':'user',content:x.text})),{role:'user',content:msg}]
        })
      })
      const data = await res.json()
      const debugText = data.debug ? ` [debug: ${JSON.stringify(data.debug)}]` : ''
      const rawText = data.content?.[0]?.text||`Could not connect right now. (${data.error||'no error detail returned'})${debugText}`
      // Loosened regex (whitespace/case tolerant) plus a fallback catch-all
      // strip of any remaining HTML-comment-style text. The model has been
      // observed occasionally emitting the marker (sometimes with an empty
      // items array) even for non-food questions despite the system prompt
      // saying not to — this guarantees the raw marker text never reaches
      // the user even if the model's formatting drifts from the pattern.
      const logMatch = rawText.match(/<!--\s*LOG_MEAL:?\s*([\s\S]*?)-->/i)
      let displayText = rawText
      let pendingMeal = null
      if (logMatch) {
        displayText = rawText.replace(logMatch[0], '').trim()
        try {
          const parsed = JSON.parse(logMatch[1])
          if (parsed.items?.length) pendingMeal = parsed.items
        } catch (e) { console.warn('LOG_MEAL parse failed:', e.message) }
      }
      // Safety net: strip any other leftover HTML-comment-looking text so
      // nothing like this can ever show up verbatim, even in an unexpected format.
      displayText = displayText.replace(/<!--[\s\S]*?-->/g, '').trim()
      setChat(h=>[...h,{role:'ai',text:displayText,pendingMeal}])
    } catch (e) {
      setChat(h=>[...h,{role:'ai',text:`Connection error: ${e.message||'unknown'}. Please try again.`}])
    }
    setChatLoading(false)
  }

  const confirmChatMealLog = async (msgIndex, items) => {
    const nutriItemsFromChat = items.map((it,i)=>({
      id:`chat-${Date.now()}-${i}`, name:it.name, portionLabel:it.portion_label||'1 serving', scale:1,
      baseCalories:it.calories||0, baseProtein:it.protein_g||0, baseCarbs:it.carbs_g||0, baseFat:it.fat_g||0,
      confidence:null, manual:true,
    }))
    const totals = nutriItemsFromChat.reduce((acc,it)=>{
      const s=scaledNutrition(it)
      return{calories:acc.calories+s.calories,protein:acc.protein+s.protein,carbs:acc.carbs+s.carbs,fat:acc.fat+s.fat}
    },{calories:0,protein:0,carbs:0,fat:0})
    const localEntry={id:Date.now(),time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),items:nutriItemsFromChat,totals,photo:null}
    setNutriLog(log=>[...log,localEntry])
    setChat(h=>h.map((m,i)=>i===msgIndex?{...m,pendingMeal:null,mealLogged:true}:m))
    try{
      await saveNutritionLog({logDate:localDateKey(),items:nutriItemsFromChat,totals,photoUrl:null,photoPath:null})
      setNutriHistory(null)
    }catch(e){ console.warn('chat meal log sync failed:',e.message) }
  }

  const handleTabClick=t=>{
    setTab(t)
  }

  // Monthly averages need 2+ months to draw a line. With less history (e.g. a 7- or 30-day iPhone sync)
  // the trend charts use one point per day instead.
  const dayLabel = k => { const [y,mo,da] = k.split('-').map(Number); return `${da} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][mo-1]}` }
  const dailySeries = map => Object.keys(map||{}).sort().map(k=>({month:dayLabel(k),rawDay:k,value:map[k]}))
  const useDaily = (monthly, map) => (monthly||[]).length<2 && Object.keys(map||{}).length>=2
  const dHrv = d.daily?.hrv || {}, dRhr = d.daily?.rhr || {}
  const dailyScores = (() => {
    const hb = l.hrvBaseline || 35, rb = l.rhrAvg || l.rhr || 65
    return Object.keys(dHrv).sort().filter(k => dRhr[k] != null).map(k => {
      const hv = dHrv[k], rv = dRhr[k]
      return { month: dayLabel(k), rawDay: k,
        readiness: Math.min(99, Math.max(10, Math.round(Math.min(100, hv / hb * 60) * 0.6 + Math.max(0, 100 - (rv - 40) * 2) * 0.4))),
        stress: Math.round(Math.min(100, Math.max(0, (1 - hv / hb) * 150)) * 0.65 + Math.min(100, Math.max(0, (rv - rb) * 5)) * 0.35) }
    })
  })()
  const rhrChartData = useDaily(m.rhr, dRhr) ? dailySeries(dRhr) : (m.rhr||[])
  const hrvChartData = useDaily(m.hrv, dHrv) ? dailySeries(dHrv) : (m.hrv||[])
  const vo2ChartData = m.vo2||[]
  const readinessChartData = (m.readiness||[]).length<2 && dailyScores.length>=2 ? dailyScores.map(x=>({month:x.month,value:x.readiness})) : (m.readiness||[])
  const stressChartData = (m.stress||[]).length<2 && dailyScores.length>=2 ? dailyScores.map(x=>({month:x.month,value:x.stress})) : (m.stress||[])
  const heartTrendData = m.rhr||[] // Heart Trend stays month-to-month on purpose
  const strainDays = (() => {
    const daily = d.daily?.strain || {}
    return Object.entries(daily)
      .sort(([a],[b])=>a.localeCompare(b))
      .slice(-14)
      .map(([date,v])=>({date:date.slice(5),strain:v}))
  })()

  const sleepNights = (() => {
    if (d.sleepNights && d.sleepNights.length > 0) {
      return d.sleepNights.slice(-14).map(s => ({
        date: s.date ? s.date.slice(5) : '',
        total: s.total,
        deep: s.deep,
        rem: s.rem,
        core: s.core,
        score: s.score,
      }))
    }
    return Object.entries(d.sleep||{})
      .sort(([a],[b])=>a.localeCompare(b))
      .slice(-14)
      .map(([date,s])=>({
        date: date.slice(5),
        total: s.total,
        deep: s.deep,
        rem: s.rem,
        core: s.core ?? 0,
        score: Math.min(100,Math.round((s.total/8)*100))
      }))
  })()

  // ── PERSONAL SLEEP NEED + SLEEP DEBT ──────────────────────────────────────
  // Replaces a hardcoded "7.8 hrs" that was identical for every user.
  // Baseline = your average sleep on nights before your better-recovery
  // mornings (HRV at or above your own median), clamped to 7–9h (never below the adult minimum). Tonight
  // adds a little extra after a hard day (strain above 10). Debt = how far
  // the last 7 recorded nights fell short of your baseline. Nights the watch
  // wasn't worn are skipped, not counted as zero sleep.
  const sleepByNight = (() => {
    const out = {}
    if (d.sleepNights && d.sleepNights.length) d.sleepNights.forEach(s=>{ if(s.date&&s.total!=null) out[s.date]=s.total })
    else Object.entries(d.sleep||{}).forEach(([date,s])=>{ if(s&&s.total!=null) out[date]=s.total })
    return out
  })()
  const fmtClock = h => {
    const x=((h%24)+24)%24, hh=Math.floor(x), mm=Math.round((x-hh)*60)
    const H=mm===60?hh+1:hh, M=mm===60?0:mm
    const ampm=(H%24)<12?'AM':'PM', h12=((H%12)||12)
    return `${h12}:${String(M).padStart(2,'0')} ${ampm}`
  }
  const sleepPlan = (() => {
    const nights = Object.keys(sleepByNight).sort()
    if (!nights.length) return null
    const hrvDaily = d.daily?.hrv || {}
    const strainDaily = d.daily?.strain || {}
    const median = arr => { const s=[...arr].sort((a,b)=>a-b), k=Math.floor(s.length/2); return s.length%2?s[k]:(s[k-1]+s[k])/2 }
    const full = nights.filter(n=>sleepByNight[n]>=4) // ignore naps / broken records
    let base = 7.5, baseSource = 'default', basedOn = 0
    const withHrv = full.filter(n=>hrvDaily[n]!=null)
    if (withHrv.length>=8) {
      const hrvMed = median(withHrv.map(n=>hrvDaily[n]))
      const good = withHrv.filter(n=>hrvDaily[n]>=hrvMed)
      if (good.length>=5) {
        base = Math.min(9, Math.max(7, good.reduce((s,n)=>s+sleepByNight[n],0)/good.length))
        baseSource = 'personal'; basedOn = good.length
      }
    }
    // Fallback when the upload has no per-night HRV: your natural sleep
    // length on unrestricted nights ≈ your need. Use the longer half of your
    // full nights (ignores >11h outliers like sick days).
    if (baseSource==='default') {
      const usable = full.map(n=>sleepByNight[n]).filter(v=>v<=11).sort((a,b)=>b-a)
      if (usable.length>=10) {
        const top = usable.slice(0, Math.ceil(usable.length/2))
        base = Math.min(9, Math.max(7, median(top)))
        baseSource = 'duration'; basedOn = top.length
      }
    }
    const strainKeys = Object.keys(strainDaily).sort()
    const latestStrain = strainKeys.length ? strainDaily[strainKeys[strainKeys.length-1]] : null
    const strainExtra = latestStrain!=null ? Math.min(0.75, Math.max(0, (latestStrain-10)*0.07)) : 0
    const tonight = base + strainExtra
    const last7 = nights.slice(-7)
    const debt = last7.reduce((s,n)=>s+Math.max(0, base-sleepByNight[n]),0)
    const lastTotal = sleepByNight[nights[nights.length-1]]
    // Target bedtime from your usual morning wake time (naps excluded)
    const wakes = (d.sleepTimes||[]).slice(-14).map(t=>t.mainWakeHour).filter(v=>typeof v==='number')
    const usualWake = wakes.length>=5 ? median(wakes) : null
    const bedtime = usualWake!=null ? fmtClock(usualWake - tonight - 0.25) : null
    return {
      base:+base.toFixed(1), baseSource, basedOn, latestStrain,
      strainExtra:+strainExtra.toFixed(1), tonight:+tonight.toFixed(1),
      debt:+debt.toFixed(1), nightsInDebt:last7.length, lastTotal,
      usualWake: usualWake!=null?fmtClock(usualWake):null, bedtime,
    }
  })()

  // ── TRAINING LOAD (acute:chronic workload ratio) ─────────────────────────
  // Average strain over the last 7 days vs the last 28. A widely used
  // sports-science heuristic: a sudden jump in load relative to what your
  // body is used to is when overuse injuries and overtraining tend to show
  // up. Needs ~3 weeks of strain history to be meaningful.
  const trainingLoad = (() => {
    const daily = d.daily?.strain || {}
    const days = Object.keys(daily).sort()
    if (!days.length) return null
    const end = new Date(days[days.length-1]+'T00:00:00')
    const within = n => days.filter(k=>{ const diff=(end-new Date(k+'T00:00:00'))/86400000; return diff>=0&&diff<n })
    const a = within(7), c = within(28)
    if (a.length<4 || c.length<21) return {insufficient:true, have:c.length}
    const avg = ks => ks.reduce((s,k)=>s+(daily[k]||0),0)/ks.length
    const acute = avg(a), chronic = avg(c)
    if (!chronic) return {insufficient:true, have:c.length}
    const ratio = acute/chronic
    const z = ratio<0.8 ? {zone:'Easing off',color:T.blue,advice:'Your load is well below your usual. Fine for a recovery week; if it lasts, fitness starts to slip.'}
      : ratio<=1.3 ? {zone:'Sweet spot',color:T.green,advice:'Training load is in line with what your body is used to. Good place to build from.'}
      : ratio<=1.5 ? {zone:'Building fast',color:T.yellow,advice:'You\'ve ramped up quickly. Keep an eye on readiness and add an easier day if it drops.'}
      : {zone:'Load spike',color:T.red,advice:'This week is far above your usual load — the pattern most linked to overuse injury. Plan a lighter day or two.'}
    return {acute:+acute.toFixed(1), chronic:+chronic.toFixed(1), ratio:+ratio.toFixed(2), ...z}
  })()

  const todayReadiness = l.readiness||50

  // ── Streaks, weekly stats, check-ins ────────────────────────────────────
  const nutriAllDays = (() => { try { return JSON.parse(localStorage.getItem(NUTRI_STORAGE_KEY) || '{}') } catch { return {} } })()
  const streaks = nutritionOnly ? {} : computeStreaks(d, nutriAllDays)
  const weekStats = nutritionOnly ? null : computeWeekStats(d, {
    sleepDebt: sleepPlan ? sleepPlan.debt : null,
    loadZone: trainingLoad && !trainingLoad.insufficient ? trainingLoad.zone : null,
    loadColor: trainingLoad && !trainingLoad.insufficient ? trainingLoad.color : null,
  })
  const todayEffort = Math.round(12 + (todayReadiness/100)*6)

  const durLabel = d.meta.durationLabel||'your data'

  return(
    <div style={{background:'#0A0A0F',minHeight:'100vh',color:'#fff',fontFamily:"'Inter',system-ui,sans-serif",position:'relative'}}>
      <div style={{
        position:'fixed',inset:0,zIndex:0,
        backgroundImage:`url('${PHOTOS[tab]||PHOTOS.today}')`,
        backgroundSize:'cover',backgroundPosition:'center',
        filter:'brightness(0.50) saturate(0.90)',
        transition:'background-image 0.5s ease'
      }}/>
      <div style={{position:'fixed',inset:0,zIndex:1,background:'rgba(10,10,15,0.38)'}}/>
      <div style={{
        position:'fixed',width:400,height:400,
        background:GLOW_COLORS[tab]||'#00FF88',
        borderRadius:'50%',filter:'blur(120px)',
        opacity:0.06,top:-100,left:-80,zIndex:1,
        transition:'background 0.5s ease'
      }}/>

      {showLimitModal&&(
        <div style={{position:'fixed',inset:0,background:'#0F2B4C99',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'rgba(15,15,22,0.98)',borderRadius:20,padding:'28px 24px',maxWidth:340,width:'100%',boxShadow:'0 20px 60px #0F2B4C33',textAlign:'center',border:'1px solid rgba(0,255,136,0.15)'}}>
            <div style={{fontSize:40,marginBottom:12}}>📊</div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff',marginBottom:8}}>Free Upload Limit Reached</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.65)',marginBottom:16,lineHeight:1.7}}>
              You've used all <b style={{color:'#00FF88'}}>{freeLimit}</b> free uploads.<br/>
              Your existing data and all features remain accessible below.
            </div>
            <button onClick={()=>onDismissLimit&&onDismissLimit()}
              style={{width:'100%',background:'#00FF88',color:'#000',border:'none',borderRadius:12,padding:'12px',fontWeight:800,fontSize:14,cursor:'pointer'}}>
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {showCoffee&&(
        <div style={{position:'fixed',inset:0,background:'rgba(10,10,15,0.92)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'rgba(15,15,22,0.98)',borderRadius:20,padding:'28px 24px',maxWidth:360,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.8)',border:'1px solid rgba(0,255,136,0.15)'}}>
            <div style={{textAlign:'center',marginBottom:16}}>
              <div style={{fontSize:32,marginBottom:8}}>☕</div>
              <div style={{fontSize:18,fontWeight:900,color:'#fff',marginBottom:6}}>You've used your 5 free AI messages</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.60)',lineHeight:1.7}}>
                VitaIQ is free to use — the AI Coach runs on real tokens that cost money. A small coffee keeps it alive and helps us improve it for everyone. 🙏 Each response costs real API tokens —
                if VitaIQ has been useful, a small coffee keeps it running! ☕
              </div>
            </div>
            <div style={{background:'rgba(255,255,255,0.06)',borderRadius:14,padding:'14px',textAlign:'center',marginBottom:14,border:'1px solid rgba(255,255,255,0.12)'}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.65)',marginBottom:10,fontWeight:600,textTransform:'uppercase',letterSpacing:1}}>
                ☕ Buy me a coffee via TNG / Maybank / Any e-wallet
              </div>
              <div style={{width:210,height:220,margin:'0 auto',overflow:'hidden',borderRadius:10,position:'relative',boxShadow:'0 2px 12px rgba(0,0,0,0.3)'}}>
                <img src="/tng-qr.jpeg" alt="TNG QR" style={{width:340,height:'auto',position:'absolute',top:-108,left:-65,imageRendering:'crisp-edges'}}/>
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.40)',marginTop:8}}>Any amount appreciated · Malaysia National QR</div>
            </div>
            <div style={{background:'rgba(0,255,136,0.08)',borderRadius:10,padding:'10px 14px',marginBottom:14,border:'1px solid rgba(0,255,136,0.15)'}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.70)',lineHeight:1.7}}>
                After buying a coffee, tap <b style={{color:'#00FF88'}}>Continue</b> below — your messages reset for this session.
              </div>
            </div>
            <button onClick={()=>{
              setAiMsgCount(0)
              localStorage.setItem('vitaiq_ai_msgs','0')
              setShowCoffee(false)
              setChat(prev=>[...prev,{role:'ai',text:'Thank you so much for your support! ☕🙏 Every coffee directly funds the AI tokens and helps keep VitaIQ improving. Your messages have been reset — keep asking!'}])
            }}
              style={{width:'100%',background:'#00FF88',color:'#000',border:'none',borderRadius:12,padding:'12px',fontWeight:800,fontSize:14,cursor:'pointer',marginBottom:8}}>
              ✓ I bought a coffee — Continue
            </button>
            <button onClick={()=>setShowCoffee(false)}
              style={{width:'100%',background:'transparent',color:'rgba(255,255,255,0.45)',border:'none',padding:'8px',fontSize:12,cursor:'pointer'}}>
              Maybe later
            </button>
          </div>
        </div>
      )}

      <div style={{position:'relative',zIndex:10,background:'rgba(10,10,15,0.85)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'10px 16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
            <button onClick={onBack} aria-label="Back" style={{background:'none',border:'none',color:'rgba(255,255,255,0.6)',fontSize:20,cursor:'pointer',padding:'0 6px 0 0',lineHeight:1}}>←</button>
            <div style={{width:28,height:28,background:'#00FF88',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>🧬</div>
            <div>
              <div style={{fontSize:15,fontWeight:900,color:'#fff'}}>VitaIQ</div>
              <div style={{fontSize:7,color:'rgba(255,255,255,0.3)',letterSpacing:1.5,whiteSpace:'nowrap'}}>HEALTH INTELLIGENCE</div>
            </div>
          </div>
          <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
            {['EN','BM','中文','தமிழ்'].map((lc,i)=>{const codes=['EN','BM','ZH','TA'];return(
              <button key={lc} onClick={()=>onLangChange&&onLangChange(codes[i])} style={{padding:'3px 7px',borderRadius:99,fontSize:9,fontWeight:700,cursor:'pointer',border:'none',background:lang===codes[i]?'rgba(0,255,136,0.15)':'rgba(255,255,255,0.06)',color:lang===codes[i]?'#00FF88':'rgba(255,255,255,0.45)',outline:lang===codes[i]?'1px solid rgba(0,255,136,0.4)':'1px solid rgba(255,255,255,0.10)'}}>{lc}</button>
            )})}
          </div>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'4px 8px',alignItems:'center',marginTop:8}}>
          {nutritionOnly&&<Badge label="No Watch Connected" color={T.yellow} bg={T.yellowBg}/>}
          {!nutritionOnly&&!isDemo&&<Badge label={d.meta.durationLabel} color={T.teal} bg={T.tealLight}/>}
          {!nutritionOnly&&isDemo&&<Badge label="DEMO" color={T.yellow} bg={T.yellowBg}/>}
          {!nutritionOnly&&!isDemo&&<span style={{fontSize:10,color:'rgba(255,255,255,0.45)',whiteSpace:'nowrap'}}>{d.meta.startDate} → {d.meta.endDate}</span>}
          {!nutritionOnly&&!isDemo&&d.meta.uploadedAt&&<span style={{fontSize:10,color:'rgba(255,255,255,0.3)',whiteSpace:'nowrap'}}>uploaded {relativeTime(d.meta.uploadedAt)}</span>}
          <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',whiteSpace:'nowrap',marginLeft:'auto'}}>Free · All features</span>
        </div>
      </div>
      <div style={{position:'relative',zIndex:5,display:'flex',gap:6,padding:'10px 16px',overflowX:'auto',scrollbarWidth:'none',background:'rgba(10,10,15,0.5)',backdropFilter:'blur(8px)',flexShrink:0}}>
        {TABS.map(t=>{
          const active=tab===t.id
          return(
            <button key={t.id} onClick={()=>handleTabClick(t.id)} style={{
              padding:'8px 16px',borderRadius:99,
              border:`1px solid ${active?'#00FF88':'rgba(255,255,255,0.15)'}`,
              cursor:'pointer',fontSize:11,fontWeight:700,whiteSpace:'nowrap',
              display:'flex',alignItems:'center',gap:5,transition:'all 0.15s',
              background:active?'#00FF88':'rgba(255,255,255,0.08)',
              color:active?'#000000':'rgba(255,255,255,0.85)',
              boxShadow:active?'0 0 16px rgba(0,255,136,0.5)':'none',
              letterSpacing:0.2,flexShrink:0,
            }}>
              <span>{t.icon}</span>
              <span>{dl.tabs[t.labelKey]||t.labelKey}</span>
            </button>
          )
        })}
      </div>
      <div style={{position:'relative',zIndex:5,maxWidth:960,margin:'0 auto',padding:'16px 14px',minHeight:'calc(100vh - 140px)'}}>

      {!hasHealthData ? (
        ['today','readiness','sleep','effort','health','behaviors','longevity','bp'].includes(tab) &&
          <NoHealthDataGate onBack={onBack}/>
      ) : (<>
        {tab==='today'&&(
          <div style={{display:'grid',gap:12}}>
            {!isDemo&&<SyncFromIPhone compact/>}
            <InstallHint/>
            <div style={{background:`linear-gradient(135deg,${rCol(todayReadiness)}0d 0%,rgba(10,10,15,0.6) 100%)`,border:`1px solid ${rCol(todayReadiness)}33`,borderRadius:14,padding:16}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{position:'relative',flexShrink:0}}>
                  <svg width={90} height={90} viewBox="0 0 90 90">
                    <circle cx={45} cy={45} r={34} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8}/>
                    <circle cx={45} cy={45} r={34} fill="none" stroke={rCol(todayReadiness)} strokeWidth={8}
                      strokeDasharray={`${(todayReadiness/100*213.6).toFixed(0)} 213.6`}
                      strokeLinecap="round" transform="rotate(-90 45 45)"/>
                  </svg>
                  <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',lineHeight:1.1}}>
                    <div style={{fontSize:22,fontWeight:900,color:rCol(todayReadiness)}}>{todayReadiness}</div>
                    <div style={{fontSize:7,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:1}}>ready</div>
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'inline-flex',alignItems:'center',gap:4,background:`${rCol(todayReadiness)}20`,color:rCol(todayReadiness),borderRadius:99,padding:'2px 10px',fontSize:10,fontWeight:700,marginBottom:6}}>
                    ● {todayReadiness>=67?'Green zone':todayReadiness>=33?'Yellow zone':'Red zone'}
                  </div>
                  <div style={{fontSize:20,fontWeight:900,color:'#fff',marginBottom:4}}>
                    {todayReadiness>=67?'Push today.':todayReadiness>=33?'Moderate day.':'Rest today.'}
                  </div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.60)',lineHeight:1.6}}>
                    {todayReadiness>=67?'Body well recovered. HRV above baseline — good day for intensity.':todayReadiness>=33?'Listen to your body. Keep effort moderate.':'Prioritise recovery. Skip hard sessions today.'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[
                ['HRV',`${fmt(l.hrv)}ms`,l.hrv>=(l.hrvBaseline||35)?T.teal:T.yellow,l.hrv>=(l.hrvBaseline||35)?'↑ above avg':'↓ below avg'],
                ['Resting HR',`${fmt(l.rhr)} bpm`,l.rhr<=65?T.teal:l.rhr<=75?T.yellow:T.red,l.rhr<=65?'↓ trending down':'avg range'],
                ['Sleep',`${sleepNights.length?sleepNights[sleepNights.length-1].score:'-'}%`,T.blue,sleepNights.length?`${sleepNights[sleepNights.length-1].total}hrs last night`:'no data'],
              ].map(([label,val,color,sub])=>(
                <div key={label} style={{background:'rgba(255,255,255,0.04)',borderRadius:10,padding:10,textAlign:'center',border:'1px solid rgba(255,255,255,0.08)'}}>
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:16,fontWeight:900,color}}>{val}</div>
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',marginTop:2}}>{sub}</div>
                </div>
              ))}
            </div>

            <Card style={{borderLeft:'3px solid #00FF88'}}>
              <div style={{fontSize:9,fontWeight:700,color:'#00FF88',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>✨ {dl.morning||"Today's brief"}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.75)',lineHeight:1.7}}>
                {isDemo
                  ? 'Demo data — upload your Apple Watch ZIP to see your personalised brief.'
                  : <><b style={{color:'#fff'}}>Readiness {todayReadiness}%</b> — {todayReadiness>=67?'great recovery.':todayReadiness>=33?'moderate recovery.':'low recovery. Rest today.'}{l.hrv&&l.hrvBaseline&&<> HRV ({fmt(l.hrv)}ms) vs your {fmt(l.hrvBaseline)}ms baseline.</>}{sleepPlan&&<> Tonight aim for <b style={{color:'#fff'}}>{sleepPlan.tonight}h</b>{sleepPlan.bedtime?<> — in bed by {sleepPlan.bedtime}</>:''}.</>}<br/><b style={{color:'#fff'}}>Data:</b> {durLabel} ({d.meta.startDate} → {d.meta.endDate}).</>
                }
              </div>
            </Card>
            {!isDemo&&<HistoryNote meta={d.meta} onClear={onClearHistory}/>}

            {(d.alerts||[]).map((a,i)=>(
              <Card key={i} style={{borderLeft:'4px solid #FFD60A'}}>
                <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <span style={{fontSize:20}}>⚠️</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#FFD60A'}}>Health Alert — {a.metric}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.65)',marginTop:4,lineHeight:1.6}}>{a.message}</div>
                  </div>
                </div>
              </Card>
            ))}

            <Card>
              <Label>Drill down</Label>
              {[
                [T.teal,'Readiness',`${todayReadiness}%`,'readiness'],
                [T.blue,'Sleep',sleepNights.length?`${sleepNights[sleepNights.length-1].score}%`:'-','sleep'],
                [T.yellow,'Effort',l.strain!=null?`${fmt(l.strain,1)}/21`:'-','effort'],
                [(d.alerts||[]).length?T.yellow:'rgba(255,255,255,0.5)','Vitals',(d.alerts||[]).length?`${d.alerts.length} alert${d.alerts.length>1?'s':''}`:'No alerts','health'],
              ].map(([color,label,val,tabId])=>(
                <div key={label} onClick={()=>handleTabClick(tabId)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.06)',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'rgba(255,255,255,0.75)'}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:color}}/>
                    {label}
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color}}>{val} ›</div>
                </div>
              ))}
            </Card>
            <StreaksCard streaks={streaks} asOf={d.meta.endDate}/>
            <CheckInCard hrvDaily={d.daily?.hrv}/>
            <ShareWeekCard stats={weekStats}/>
            <AffiliateInlineCard tab='today'/>
          </div>
        )}
        {tab==='readiness'&&(
          <div style={{display:'grid',gap:14}}>
            <AffiliateInlineCard tab='readiness'/>
            <Card>
              <Label>Readiness Score — {durLabel}<InfoTip text="Compares today's HRV and resting heart rate to your rolling 60-day average — not your entire upload history. This keeps your score consistent no matter how many months of data you export."/></Label>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:14}}>Green ≥ 67% · Yellow 33–66% · Red &lt; 33%</div>
              <ChartBox height={220}>
                <AreaChart data={readinessChartData}>
                  <defs><linearGradient id="rdG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF88" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#00FF88" stopOpacity={0}/>
                  </linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'rgba(255,255,255,0.4)'}}/>
                  <YAxis domain={[0,100]} tick={{fontSize:10,fill:'rgba(255,255,255,0.4)'}}/>
                  <TT formatter={v=>[`${v}%`]}/>
                  <ReferenceLine y={67} stroke="#00FF88" strokeDasharray="4 3" label={{value:'Green',fill:'#00FF88',fontSize:7,position:'right',opacity:0.7}}/>
                  <ReferenceLine y={33} stroke="#FF3B5C" strokeDasharray="4 3" label={{value:'Red',fill:'#FF3B5C',fontSize:7,position:'right',opacity:0.7}}/>
                  <Area type="monotone" dataKey="value" stroke="#00FF88" strokeWidth={2.5} fill="url(#rdG)" dot={{r:4,fill:'#00FF88'}} name="Readiness"/>
                </AreaChart>
              </ChartBox>
            </Card>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:14,minWidth:0}}>
              <Card>
                <Label>HRV — {durLabel} trend</Label>
                <ChartBox height={170}>
                  <LineChart data={hrvChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                    <XAxis dataKey="month" tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                    <YAxis tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                    <TT formatter={v=>[`${v} ms`]}/>
                    <Line type="monotone" dataKey="value" stroke="#BF5AF2" strokeWidth={2} dot={{r:3}} name="HRV"/>
                  </LineChart>
                </ChartBox>
              </Card>
              <Card>
                <Label>Resting Heart Rate — {durLabel}</Label>
                <ChartBox height={170}>
                  <LineChart data={rhrChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                    <XAxis dataKey="month" tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                    <YAxis tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                    <TT formatter={v=>[`${v} bpm`]}/>
                    <ReferenceLine y={60} stroke="#00FF88" strokeDasharray="3 3" opacity={0.4}/>
                    <Line type="monotone" dataKey="value" stroke="#FF3B5C" strokeWidth={2} dot={{r:3}} name="RHR"/>
                  </LineChart>
                </ChartBox>
              </Card>
            </div>
            <Card>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                <div>
                  <Label>Stress Index<InfoTip text="Same rolling 60-day baseline as Readiness — your stress score reflects today vs. your recent normal, not your entire upload history."/></Label>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>From HRV + resting HR vs your own baseline — lower is calmer</div>
                </div>
              </div>
              {l.stressIndex!=null?(
                <div style={{display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
                  <Ring value={l.stressIndex} max={100} size={100} stroke={9}
                    color={l.stressIndex>=67?'#FF3B5C':l.stressIndex>=34?'#FFD60A':'#00FF88'}
                    label={l.stressLabel||''} />
                  {stressChartData.length>0&&
                    <div style={{flex:1,minWidth:160}}>
                      <ChartBox height={120}>
                        <LineChart data={stressChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                          <XAxis dataKey="month" tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                          <YAxis domain={[0,100]} tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                          <TT formatter={v=>[`${v}`]}/>
                          <Line type="monotone" dataKey="value" stroke="#FF3B5C" strokeWidth={2} dot={{r:2}} name="Stress"/>
                        </LineChart>
                      </ChartBox>
                    </div>}
                </div>
              ):(
                <DataGapNotice needs={['Heart Rate Variability','Resting Heart Rate']}
                  note="Stress Index needs HRV and Resting Heart Rate from your Apple Watch. Check both in Simple Health Export CSV, export again, and re-upload."/>
              )}
            </Card>
            <Card>
              <Label>Readiness Breakdown</Label>
              <StatBar label="HRV" value={`${fmt(l.hrv)} ms`} pct={l.hrv&&l.hrvBaseline?Math.min(100,(l.hrv/l.hrvBaseline)*60):50} color="#00FF88"
                note={`Latest (${d.meta.endDate||'—'}): ${fmt(l.hrv)}ms · ${durLabel} avg: ${fmt(l.hrvBaseline)}ms`}/>
              <StatBar label="Resting HR" value={`${fmt(l.rhr)} bpm`} pct={l.rhr?Math.max(0,100-(l.rhr-40)*2):50} color="#00FF88"
                note={`Latest (${d.meta.endDate||'—'}): ${fmt(l.rhr)}bpm · ${durLabel} avg: ${fmt(l.rhrAvg)}bpm`}/>
              <StatBar label="SpO2" value={`${fmt(l.spo2)}%`} pct={l.spo2?Math.min(100,(l.spo2-88)*8):70} color={l.spo2>=95?'#00FF88':'#FFD60A'}
                note={`Latest (${d.meta.endDate||'—'}): ${fmt(l.spo2)}% · ${durLabel} avg: ${fmt(l.spo2Avg)}% · ${l.spo2DipsBelow90} dips <90%`}/>
              <StatBar label="Resp Rate" value={`${fmt(l.rr)} br/min`} pct={l.rr?Math.max(0,100-(Math.abs(l.rr-14))*10):80} color="#00FF88"
                note={`Latest (${d.meta.endDate||'—'}): ${fmt(l.rr)} · ${durLabel} avg: ${fmt(l.rrAvg)} br/min`}/>
            </Card>
          </div>
        )}

        {tab==='sleep'&&(
          <div style={{display:'grid',gap:14}}>
            <AffiliateInlineCard tab='sleep'/>
            {sleepNights.length>0?(
              <>
                <Card>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                    <div>
                      <Label>Vitality Score · Last Night</Label>
                      <div style={{fontSize:52,fontWeight:900,color:'#4D9EFF',lineHeight:1}}>
                        {sleepNights[sleepNights.length-1].score}<span style={{fontSize:22}}>%</span>
                      </div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',marginTop:4}}>
                        {sleepNights[sleepNights.length-1].date} · {sleepNights[sleepNights.length-1].total} hrs
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',marginBottom:4}}>
                        TONIGHT'S NEED
                        <InfoTip text={sleepPlan&&sleepPlan.baseSource==='personal'
                          ? `Your baseline (${sleepPlan.base}h) is your average sleep on the ${sleepPlan.basedOn} nights before your best-recovery mornings (HRV at or above your usual). A hard day adds up to 45 min. Sleep debt = how far your last ${sleepPlan.nightsInDebt} recorded nights fell short of your baseline. Never set below 7h, the minimum recommended for adults.`
                          : sleepPlan&&sleepPlan.baseSource==='duration'
                          ? `Your baseline (${sleepPlan.base}h) comes from your ${sleepPlan.basedOn} longest full nights — how long you sleep when nothing cuts it short. A hard day adds up to 45 min. Sleep debt = how far your last ${sleepPlan.nightsInDebt} recorded nights fell short of your baseline. Never set below 7h, the minimum recommended for adults.`
                          : 'Using a 7.5h starting point until there are at least 10 recorded nights. After that, VitaIQ learns how much sleep YOU need. Sleep debt = how far your recent recorded nights fell short.'}/>
                      </div>
                      <div style={{fontSize:24,fontWeight:700,color:'#fff'}}>{sleepPlan?sleepPlan.tonight:7.5} hrs</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.45)'}}>
                        {sleepPlan&&sleepPlan.baseSource!=='default'?`your baseline ${sleepPlan.base}h`:'default 7.5h · learning'}
                        {sleepPlan?.strainExtra>0?` + ${sleepPlan.strainExtra}h for effort`:''}
                      </div>
                      {sleepPlan&&sleepPlan.debt>=0.5&&
                        <div style={{marginTop:8}}><Badge label={`Debt: ${sleepPlan.debt} hrs · ${sleepPlan.nightsInDebt} nights`} color={sleepPlan.debt>=5?'#FF3B5C':'#FFD60A'} bg={sleepPlan.debt>=5?'rgba(255,59,92,0.12)':'rgba(255,214,10,0.12)'}/></div>}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',marginBottom:8,textTransform:'uppercase',letterSpacing:1.5}}>Sleep Stages</div>
                    {(()=>{
                      const last=sleepNights[sleepNights.length-1]
                      return(
                        <div style={{display:'flex',height:22,borderRadius:8,overflow:'hidden',gap:2}}>
                          {[['rgba(255,255,255,0.2)',last.awake||0,'Awake'],
                            ['rgba(77,158,255,0.7)',last.core,'Core'],
                            ['#00FF88',last.deep,'Deep'],
                            ['#BF5AF2',last.rem,'REM'],
                          ].map(([c,w,lb])=>{
                            const total=last.total||1
                            return <div key={lb} style={{background:c,width:`${Math.max(0,(w/total)*100)}%`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:700}}>{(w/total)*100>15?lb:''}</div>
                          })}
                        </div>
                      )
                    })()}
                    <div style={{display:'flex',gap:14,marginTop:8}}>
                      {[['Deep','#00FF88',sleepNights[sleepNights.length-1].deep],['REM','#BF5AF2',sleepNights[sleepNights.length-1].rem],['Core','rgba(77,158,255,0.7)',sleepNights[sleepNights.length-1].core]].map(([lb,c,v])=>(
                        <div key={lb} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'rgba(255,255,255,0.60)'}}>
                          <div style={{width:8,height:8,borderRadius:2,background:c}}/>{lb}: <b style={{color:'#fff'}}>{fmt(v,1)}h</b>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,200px),1fr))',gap:14,minWidth:0}}>
                  <Card>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:6}}>Sleep Consistency</div>
                    {l.sleepConsistency!=null?(
                      <>
                        <div style={{fontSize:32,fontWeight:900,color:l.sleepConsistency>=70?'#00FF88':l.sleepConsistency>=40?'#FFD60A':'#FF3B5C'}}>
                          {l.sleepConsistency}<span style={{fontSize:14,color:'rgba(255,255,255,0.4)'}}>/100</span>
                        </div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:6}}>How stable your bedtime + wake time were over the last 14 nights</div>
                      </>
                    ):(
                      <DataGapNotice compact needs={['3+ nights of Sleep data']}
                        note="Keep wearing your Apple Watch to sleep for a few more nights, then re-upload."/>
                    )}
                  </Card>
                  <Card>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:6}}>Sleep Efficiency</div>
                    {l.sleepEfficiency!=null?(
                      <>
                        <div style={{fontSize:32,fontWeight:900,color:l.sleepEfficiency>=85?'#00FF88':l.sleepEfficiency>=75?'#FFD60A':'#FF3B5C'}}>
                          {l.sleepEfficiency}<span style={{fontSize:14,color:'rgba(255,255,255,0.4)'}}>%</span>
                        </div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:6}}>Time actually asleep vs time in bed</div>
                      </>
                    ):(
                      <DataGapNotice compact needs={['Time in Bed']}
                        note='Check "Time in Bed" in Simple Health Export CSV, export again, and re-upload.'/>
                    )}
                  </Card>
                </div>
                <Card>
                  <Label>Vitality Score — Last {sleepNights.length} Nights</Label>
                  <ChartBox height={200}>
                    <BarChart data={sleepNights}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                      <XAxis dataKey="date" tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                      <YAxis domain={[0,100]} tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                      <TT formatter={v=>[`${v}%`]}/>
                      <ReferenceLine y={85} stroke="#00FF88" strokeDasharray="3 3" label={{value:'Great',fill:'#00FF88',fontSize:7,opacity:0.7}}/>
                      <ReferenceLine y={60} stroke="#FFD60A" strokeDasharray="3 3" label={{value:'OK',fill:'#FFD60A',fontSize:7,opacity:0.7}}/>
                      <Bar dataKey="score" name="Vitality %" radius={[4,4,0,0]} fill="#4D9EFF"/>
                    </BarChart>
                  </ChartBox>
                </Card>
                <Card>
                  <Label>Sleep Coach</Label>
                  {(()=>{
                    const tips=[]
                    const sp=sleepPlan
                    if(sp){
                      if(sp.bedtime) tips.push({icon:'🛏️',tip:`Aim to be in bed by ${sp.bedtime}`,sub:`Gets you ${sp.tonight}h before your usual wake time of ${sp.usualWake}`})
                      else tips.push({icon:'🛏️',tip:`Aim for ${sp.tonight} hours tonight`,sub:sp.strainExtra>0?`Includes ${sp.strainExtra}h extra because yesterday's effort was high (strain ${sp.latestStrain})`:'Matches your sleep baseline'})
                      if(sp.debt>=0.5){
                        const pay=Math.min(1,+(sp.debt/4).toFixed(1))
                        tips.push({icon:'💤',tip:`${sp.debt}h of sleep debt this week`,sub:`Pay it back gradually: about ${pay}h extra per night (or a 20–30 min early-afternoon nap) rather than one very long lie-in`})
                      } else tips.push({icon:'✅',tip:'No meaningful sleep debt',sub:`Your last ${sp.nightsInDebt} recorded nights roughly met your baseline`})
                    }
                    const short=sleepNights.filter(n=>n.total<7).length
                    tips.push({icon:'😴',tip:short>sleepNights.length/2?'Short nights are your biggest gap':'Short nights',sub:`${short} of ${sleepNights.length} tracked nights were under 7 hrs`})
                    return tips
                  })().map((r,i)=>(
                    <div key={i} style={{display:'flex',gap:12,marginBottom:14,alignItems:'flex-start'}}>
                      <span style={{fontSize:22}}>{r.icon}</span>
                      <div><div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:2}}>{r.tip}</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.50)',marginTop:2}}>{r.sub}</div></div>
                    </div>
                  ))}
                </Card>
              </>
            ):(
              <Card><div style={{textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.45)'}}>
                <div style={{fontSize:32,marginBottom:12}}>😴</div>
                <div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:8}}>No sleep data found</div>
                <div style={{fontSize:13}}>Make sure your export includes SleepAnalysis data.</div>
              </div></Card>
            )}
          </div>
        )}

        {tab==='effort'&&(
          <div style={{display:'grid',gap:14}}>
            <SessionsCard sessions={d.sessions||[]} hrDiag={d.hrDiag||null}/>
            <AffiliateInlineCard tab='effort'/>
            <Card>
              <Label>VO2 Max — {durLabel}</Label>
              <ChartBox height={200}>
                <AreaChart data={vo2ChartData}>
                  <defs><linearGradient id="v2G" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFD60A" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#FFD60A" stopOpacity={0}/>
                  </linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'rgba(255,255,255,0.4)'}}/>
                  <YAxis tick={{fontSize:10,fill:'rgba(255,255,255,0.4)'}}/>
                  <TT formatter={v=>[`${v} mL/kg/min`]}/>
                  <ReferenceLine y={40} stroke="#FFD60A" strokeDasharray="3 3" label={{value:'Good',fill:'#FFD60A',fontSize:7,opacity:0.7}}/>
                  <ReferenceLine y={42} stroke="#00FF88" strokeDasharray="3 3" label={{value:'Excellent',fill:'#00FF88',fontSize:7,opacity:0.7}}/>
                  <Area type="monotone" dataKey="value" stroke="#FFD60A" strokeWidth={2.5} fill="url(#v2G)" dot={{r:3}} name="VO2 Max"/>
                </AreaChart>
              </ChartBox>
              {l.vo2&&<div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:8}}>
                Latest ({d.meta.endDate}): <b style={{color:'#FFD60A'}}>{fmt(l.vo2,2)}</b> · Personal best: <b style={{color:'#00FF88'}}>{fmt(l.vo2Max,2)}</b> mL/kg/min
              </div>}
            </Card>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:14,minWidth:0}}>
              <Card>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:6}}>Latest VO2 Max ({d.meta.endDate||'—'})</div>
                <div style={{fontSize:32,fontWeight:900,color:'#FFD60A'}}>{fmt(l.vo2,2)}<span style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginLeft:4}}>mL/kg/min</span></div>
                <div style={{fontSize:11,color:l.vo2&&l.vo2>=42?'#00FF88':l.vo2&&l.vo2>=38?'#FFD60A':'#FF3B5C',marginTop:6}}>{l.vo2?l.vo2>=42?'Excellent ✓':l.vo2>=38?'Good':'Below average':'No data'}</div>
              </Card>
              <Card>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:6}}>Personal Best</div>
                <div style={{fontSize:32,fontWeight:900,color:'#00FF88'}}>{fmt(l.vo2Max,2)}<span style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginLeft:4}}>mL/kg/min</span></div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:6}}>All-time high in this export</div>
              </Card>
            </div>
            <Card>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                <div>
                  <Label>Strain<InfoTip text="Compares today's activity to your rolling 60-day average daily exertion — not your entire upload history — so this stays consistent regardless of export length."/></Label>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>Daily exertion (0–21) from active energy + exercise minutes vs your own average day</div>
                </div>
              </div>
              {l.strain!=null?(
                <div style={{display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
                  <Ring value={l.strain} max={21} size={100} stroke={9} color="#4D9EFF"
                    label="Today" sub={l.strainAvg!=null?`avg ${fmt(l.strainAvg,1)}`:undefined}/>
                  {strainDays.length>0&&
                    <div style={{flex:1,minWidth:160}}>
                      <ChartBox height={120}>
                        <BarChart data={strainDays}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                          <XAxis dataKey="date" tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                          <YAxis domain={[0,21]} tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                          <TT formatter={v=>[`${v}`]}/>
                          <Bar dataKey="strain" name="Strain" radius={[4,4,0,0]} fill="#4D9EFF"/>
                        </BarChart>
                      </ChartBox>
                    </div>}
                </div>
              ):(
                <DataGapNotice needs={['Active Energy','Exercise Minutes']}
                  note="Strain needs Active Energy and Exercise Minutes from your Apple Watch. Check both in Simple Health Export CSV, export again, and re-upload."/>
              )}
            </Card>
            <Card>
              <Label>Training Load<InfoTip text="Acute:chronic workload ratio — your average daily strain over the last 7 days divided by your average over the last 28. A widely used sports-science rule of thumb: 0.8–1.3 is the 'sweet spot'; a sudden jump above ~1.5 is when overuse injuries tend to show up. It's a guide, not a diagnosis."/></Label>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:12}}>This week's effort vs what your body is used to (last 4 weeks)</div>
              {!trainingLoad||trainingLoad.insufficient?(
                <DataGapNotice compact needs={['3+ weeks of Active Energy','Exercise Minutes']}
                  note={`Training load needs at least 21 days of strain history${trainingLoad?.have?` (this export has ${trainingLoad.have} of the last 28)`:''}. Export a longer date range in Simple Health Export CSV and re-upload.`}/>
              ):(()=>{
                const tl=trainingLoad, max=2
                const pos=Math.min(100,Math.max(0,tl.ratio/max*100))
                const seg=[[0,0.8,T.blue],[0.8,1.3,T.green],[1.3,1.5,T.yellow],[1.5,2,T.red]]
                const warn=tl.ratio>1.3&&todayReadiness<50
                return(
                  <>
                    <div style={{display:'flex',alignItems:'baseline',gap:12,flexWrap:'wrap',marginBottom:12}}>
                      <div style={{fontSize:40,fontWeight:900,color:tl.color,lineHeight:1}}>{tl.ratio.toFixed(2)}</div>
                      <div style={{fontSize:15,fontWeight:700,color:tl.color}}>{tl.zone}</div>
                    </div>
                    <div style={{position:'relative',height:10,borderRadius:99,overflow:'hidden',display:'flex',marginBottom:4}}>
                      {seg.map(([a,b,c])=>(<div key={a} style={{width:`${(b-a)/max*100}%`,background:c,opacity:0.55}}/>))}
                    </div>
                    <div style={{position:'relative',height:14,marginBottom:6}}>
                      <div style={{position:'absolute',left:`calc(${pos}% - 6px)`,top:-14,width:12,height:12,borderRadius:'50%',background:'#fff',border:`2px solid ${tl.color}`,boxShadow:`0 0 8px ${tl.color}`}}/>
                      {[0,0.8,1.3,1.5,2].map(v=>(<span key={v} style={{position:'absolute',left:`${v/max*100}%`,transform:v===0?'none':v===2?'translateX(-100%)':'translateX(-50%)',fontSize:9,color:'rgba(255,255,255,0.35)'}}>{v}</span>))}
                    </div>
                    <div style={{display:'flex',gap:20,flexWrap:'wrap',fontSize:12,color:'rgba(255,255,255,0.6)',marginBottom:10}}>
                      <div>Last 7 days <b style={{color:'#fff'}}>{tl.acute}</b> avg strain</div>
                      <div>Last 28 days <b style={{color:'#fff'}}>{tl.chronic}</b> avg strain</div>
                    </div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',lineHeight:1.5}}>{tl.advice}</div>
                    {warn&&(
                      <div style={{marginTop:12,padding:'10px 12px',borderRadius:10,background:'rgba(255,59,92,0.10)',border:'1px solid rgba(255,59,92,0.35)',fontSize:12,color:'#FF8FA3',lineHeight:1.5}}>
                        ⚠️ Load is rising while readiness is low ({todayReadiness}). That combination is the classic overtraining warning sign — consider a rest or easy day today.
                      </div>
                    )}
                  </>
                )
              })()}
            </Card>
          </div>
        )}

        {tab==='health'&&(
          <div style={{display:'grid',gap:14}}>
            <AffiliateInlineCard tab='health'/>
            <div>
              <Label style={{marginBottom:10}}>Latest = most recent reading ({d.meta.endDate}) · Baseline = {durLabel} avg</Label>
              {[
                {id:'hrv',icon:'⚡',name:'HRV',full:'Heart Rate Variability',
                  val:`${fmt(l.hrv)}ms`,color:l.hrv>=(l.hrvBaseline||35)?'#00FF88':'#FFD60A',
                  status:l.hrv>=(l.hrvBaseline||35)?'Above your baseline':'Below your baseline',
                  what:'The variation in time between each heartbeat. Higher HRV = well recovered. Lower HRV = body under stress — from exercise, illness, or poor sleep.',
                  ranges:[['Low','< 30ms','#FF3B5C'],['Average','30–60ms','#FFD60A'],['Great','> 60ms','#00FF88']],
                  tip:'HRV improves with consistent sleep, less alcohol, and Zone 2 cardio.',
                  yourNote:`${fmt(l.hrv)}ms — ${l.hrv>=(l.hrvBaseline||35)?'above':'below'} your ${fmt(l.hrvBaseline)}ms baseline`},
                {id:'rhr',icon:'❤️',name:'RHR',full:'Resting Heart Rate',
                  val:`${fmt(l.rhr)} bpm`,color:l.rhr<=65?'#00FF88':l.rhr<=75?'#FFD60A':'#FF3B5C',
                  status:l.rhr<=65?'Athletic range':'Normal range',
                  what:'How many times your heart beats per minute at rest. Lower is better — your heart pumps more efficiently. Elite athletes are often below 50 bpm.',
                  ranges:[['Athletic','< 60','#00FF88'],['Normal','60–80','#FFD60A'],['Elevated','> 80','#FF3B5C']],
                  tip:`Your RHR improved ${fmt((l.rhrAvg||72)-l.rhr)} bpm over ${durLabel} — excellent cardiovascular progress.`,
                  yourNote:`${fmt(l.rhr)} bpm · ${durLabel} avg: ${fmt(l.rhrAvg)} bpm`},
                {id:'spo2',icon:'🫧',name:'SpO2',full:'Blood Oxygen',
                  val:`${fmt(l.spo2)}%`,color:l.spo2>=95?'#4D9EFF':'#FFD60A',
                  status:l.spo2>=95?'Healthy range':'Monitor closely',
                  what:'Percentage of red blood cells carrying oxygen. Below 90% during sleep can indicate sleep apnoea and warrants a doctor visit.',
                  ranges:[['Concern','< 90%','#FF3B5C'],['OK','90–95%','#FFD60A'],['Healthy','> 95%','#4D9EFF']],
                  tip:l.spo2DipsBelow90>5?`${l.spo2DipsBelow90} dips below 90% detected — worth discussing with a doctor.`:'SpO2 looks healthy. Keep monitoring.',
                  yourNote:`${fmt(l.spo2)}% avg · ${l.spo2DipsBelow90||0} dips below 90%`},
                {id:'vo2',icon:'🔥',name:'VO2 Max',full:'Cardio Fitness',
                  val:l.vo2?`${fmt(l.vo2,1)} mL/kg/min`:'No data',
                  color:l.vo2>=42?'#00FF88':l.vo2>=35?'#FFD60A':'rgba(255,255,255,0.4)',
                  status:l.vo2?l.vo2>=42?'Excellent':'Good':'Not yet recorded',
                  what:'Max oxygen your body can use during exercise. Gold standard for cardiovascular fitness. Watch calculates it automatically during outdoor GPS runs.',
                  ranges:[['Below avg','< 35','#FF3B5C'],['Good','35–45','#FFD60A'],['Excellent','> 45','#00FF88']],
                  tip:'Do a 20-min outdoor GPS run — Watch calculates VO2 Max within 24 hrs.',
                  yourNote:l.vo2?`${fmt(l.vo2,1)} — ${l.vo2>=42?'Excellent ✓':l.vo2>=35?'Good':'Below average'}`:'Complete an outdoor GPS run to generate'},
              ].map(m=>{
                const isOpen = vitalsOpen===m.id
                return (
                  <div key={m.id} onClick={()=>setVitalsOpen(v=>v===m.id?null:m.id)}
                    style={{background:'rgba(255,255,255,0.04)',borderRadius:12,border:`1px solid ${isOpen?m.color+'44':'rgba(255,255,255,0.08)'}`,marginBottom:8,overflow:'hidden',cursor:'pointer',transition:'border-color 0.2s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px'}}>
                      <span style={{fontSize:18,flexShrink:0}}>{m.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{m.name} <span style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:400}}>{m.full}</span></div>
                        <div style={{fontSize:10,color:m.color,marginTop:1}}>{m.status}</div>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:m.color}}>{m.val}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginLeft:4}}>{isOpen?'▲':'▼'}</div>
                    </div>
                    {isOpen&&(
                      <div style={{padding:'0 14px 14px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                        <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:1,margin:'10px 0 5px'}}>What is it?</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.65)',lineHeight:1.7}}>{m.what}</div>
                        <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:1,margin:'10px 0 5px'}}>Ranges</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:8}}>
                          {m.ranges.map(([lbl,v,c])=>(
                            <div key={lbl} style={{background:`${c}18`,borderRadius:8,padding:'6px',textAlign:'center'}}>
                              <div style={{fontSize:8,color:c,fontWeight:700,textTransform:'uppercase'}}>{lbl}</div>
                              <div style={{fontSize:10,color:c,fontWeight:700}}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'7px 10px',border:'1px solid rgba(255,255,255,0.08)',marginBottom:8}}>
                          <span style={{fontSize:9,color:'rgba(255,255,255,0.5)'}}>Your reading: </span>
                          <span style={{fontSize:11,fontWeight:700,color:m.color}}>{m.yourNote}</span>
                        </div>
                        <div style={{background:'rgba(0,255,136,0.06)',borderRadius:8,padding:'7px 10px',border:'1px solid rgba(0,255,136,0.15)'}}>
                          <span style={{fontSize:10,color:'#00FF88'}}>💡 {m.tip}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <Card>
              <Label>Health Monitor</Label>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:16}}>
                Latest = most recent reading ({d.meta.endDate||'—'}) · Baseline = avg over {durLabel}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[
                  {icon:'❤️',label:'Resting HR',val:`${fmt(l.rhr)}`,unit:'bpm',color:l.rhr<=65?'#00FF88':l.rhr<=75?'#FFD60A':'#FF3B5C',note:`Latest · ${durLabel} avg: ${fmt(l.rhrAvg)} bpm`},
                  {icon:'⚡',label:'HRV',val:`${fmt(l.hrv)}`,unit:'ms',color:l.hrv>=(l.hrvBaseline||35)?'#00FF88':'#FFD60A',note:`Latest · ${durLabel} avg: ${fmt(l.hrvBaseline)} ms`},
                  {icon:'💨',label:'Resp Rate',val:`${fmt(l.rr)}`,unit:'br/min',color:l.rr>=12&&l.rr<=16?'#00FF88':'#FFD60A',note:`Latest · ${durLabel} avg: ${fmt(l.rrAvg)}`},
                  {icon:'🫧',label:'SpO2',val:`${fmt(l.spo2)}`,unit:'%',color:l.spo2>=95?'#00FF88':'#FFD60A',note:`Latest · avg ${fmt(l.spo2Avg)}% · ${l.spo2DipsBelow90} dips <90%`},
                  {icon:'🌡️',label:'Skin Temp',val:`${fmt(l.wristTemp,2)}`,unit:'°C',color:'#00FF88',note:`Latest · ${durLabel} avg: ${fmt(l.wristTempBaseline,2)}°C`},
                  {icon:'🧠',label:'Stress Index',val:`${l.stress}`,unit:'/100',color:l.stress<=30?'#00FF88':l.stress<=60?'#FFD60A':'#FF3B5C',note:l.stress<=30?'Low stress — well recovered':'Monitor closely'},
                ].map(v=>(
                  <div key={v.label} style={{background:'rgba(255,255,255,0.04)',borderRadius:12,padding:'14px',border:`1px solid ${v.color}22`}}>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.50)',marginBottom:5}}>{v.icon} {v.label}</div>
                    <div style={{fontSize:22,fontWeight:900,color:v.color,textShadow:`0 0 10px ${v.color}55`}}>
                      {v.val}<span style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginLeft:2}}>{v.unit}</span>
                    </div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.40)',marginTop:4}}>{v.note}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <Label>Guided Breathwork · 4·4·6 Box Breathing</Label>
              <div style={{display:'flex',justifyContent:'center',padding:'8px 0'}}>
                <Breathwork/>
              </div>
            </Card>
            {(d.alerts||[]).length>0&&(
              <Card style={{borderLeft:`4px solid #FFD60A`}}>
                <Label>{dl.alerts||'Health Alerts'}</Label>
                {d.alerts.map((a,i)=>(
                  <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:i<d.alerts.length-1?12:0}}>
                    <span style={{fontSize:24}}>🫧</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'#FFD60A'}}>{a.metric} — Alert</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.65)',marginTop:4,lineHeight:1.6}}>{a.message}</div>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {tab==='behaviors'&&(
          <div style={{display:'grid',gap:14}}>
            <AffiliateInlineCard tab='behaviors'/>
            <Card>
              <Label>Habit Insights — from your {durLabel} of data</Label>
              {(d.habitInsights&&d.habitInsights.length>0)?(
                d.habitInsights.map((b,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <span style={{fontSize:16}}>{b.neutral?'➖':b.pos?'✅':'⚠️'}</span>
                      <span style={{fontSize:13,color:'rgba(255,255,255,0.80)'}}>{b.h}</span>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:b.neutral?'rgba(255,255,255,0.5)':b.pos?'#00FF88':'#FF3B5C'}}>{b.e}</span>
                  </div>
                ))
              ):(
                <DataGapNotice needs={['Workouts']}
                  note="Habit insights need workout data (and a few weeks of it) to find real patterns. Check &quot;Workouts&quot; in Simple Health Export CSV, export again, and re-upload — or keep using the app for a few more weeks if you've already got workouts logged."/>
              )}
            </Card>
            <CheckinInsightsCard hrvDaily={d.daily?.hrv}/>
            <Card>
              <Label>Your Action Plan</Label>
              {[
                {p:'🔴',l:'Fix sleep consistency',a:'Set consistent bedtime + wake time — commit 14 days',i:`${sleepNights.filter(n=>n.total<7).length} of ${sleepNights.length} nights under 7hrs`},
                {p:'🟡',l:'Daily mindfulness',a:'5 min breathwork each morning — use Vitals tab',i:'Supports recovery — no HRV estimate yet without Mindful Minutes data'},
                {p:l.spo2DipsBelow90>5?'🔴':'🟢',l:'SpO2 monitoring',a:l.spo2DipsBelow90>5?'Discuss sleep dips with doctor':'SpO2 looks healthy — keep monitoring',i:`${l.spo2DipsBelow90} readings below 90%`},
                {p:'🟢',l:l.vo2&&l.vo2>=42?'Maintain VO2 excellence':'Push VO2 Max higher',a:'Add 1 tempo run/week · 20 min Zone 3–4',i:l.vo2?`Current: ${fmt(l.vo2,1)} · Excellent threshold: 42.0`:'No VO2 data in this export'},
              ].map((a,i)=>(
                <div key={i} style={{display:'flex',gap:12,marginBottom:12,alignItems:'flex-start',padding:'12px',background:'rgba(255,255,255,0.03)',borderRadius:10}}>
                  <span style={{fontSize:18,flexShrink:0}}>{a.p}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:2}}>{a.l}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.60)'}}>{a.a}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.40)',marginTop:3}}>📈 {a.i}</div>
                  </div>
                </div>
              ))}
            </Card>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',textAlign:'center'}}>⚕️ For personal insight only. Not medical advice.</div>
          </div>
        )}

        {tab==='longevity'&&(
          <div style={{display:'grid',gap:14}}>
            <AffiliateInlineCard tab='longevity'/>
            <Card>
              <Label>Longevity Score · Biological Age</Label>
              <div style={{display:'flex',gap:20,alignItems:'center',marginBottom:20}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:4}}>BIO AGE DELTA</div>
                  <div style={{fontSize:56,fontWeight:900,color:'#00FF88',lineHeight:1,textShadow:'0 0 20px rgba(0,255,136,0.4)'}}>
                    {l.vo2&&l.rhr?(l.vo2>=42&&l.rhr<=65?'-2':l.vo2>=40&&l.rhr<=68?'-1':'0'):'-'}
                  </div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.55)'}}>years vs chronological</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.70)',lineHeight:1.8,marginBottom:10}}>
                    Based on VO2 Max ({fmt(l.vo2,1)}) and RHR trend ({fmt(l.rhr)} bpm),
                    your cardiovascular fitness suggests your body is aging
                    <b style={{color:'#00FF88'}}> {l.vo2>=40?'at or below':'slightly above'} average</b> for your age group.
                  </div>
                  <Badge label={l.vo2>=40?'Pace: Slowing ↓':'Pace: Average'} color="#00FF88" bg="rgba(0,255,136,0.12)"/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[
                  {n:'Sleep',s:sleepNights.length?Math.round(sleepNights.slice(-7).reduce((a,b)=>a+b.score,0)/Math.min(7,sleepNights.length)):50,color:'#4D9EFF',ms:[`Avg ${fmt(sleepNights.slice(-7).reduce((a,b)=>a+b.total,0)/Math.max(1,sleepNights.slice(-7).length),1)}hrs/night`,`${sleepNights.filter(n=>n.total<7).length} nights under 7hrs`]},
                  {n:'Activity',s:l.vo2?Math.min(99,Math.round((l.vo2/50)*100)):60,color:'#FFD60A',ms:[`VO2: ${fmt(l.vo2,1)} mL/kg/min`,`Best: ${fmt(l.vo2Max,1)}`]},
                  {n:'Fitness',s:l.rhr?Math.min(99,Math.max(10,Math.round((80-l.rhr)/20*100))):60,color:'#00FF88',ms:[`RHR: ${fmt(l.rhr)} bpm`,`HRV: ${fmt(l.hrv)} ms`]},
                ].map(p=>(
                  <div key={p.n} style={{background:'rgba(255,255,255,0.04)',borderRadius:14,padding:'14px 12px',border:`1px solid ${p.color}22`}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>{p.n}</span>
                      <span style={{fontSize:20,fontWeight:900,color:p.color,textShadow:`0 0 8px ${p.color}66`}}>{p.s}</span>
                    </div>
                    <div style={{background:'rgba(255,255,255,0.08)',borderRadius:99,height:5,marginBottom:10}}>
                      <div style={{width:`${p.s}%`,height:'100%',background:p.color,borderRadius:99}}/>
                    </div>
                    {p.ms.map(ms2=><div key={ms2} style={{fontSize:10,color:'rgba(255,255,255,0.50)',marginBottom:3}}>· {ms2}</div>)}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab==='bp'&&(
          <div style={{display:'grid',gap:14}}>
            <AffiliateInlineCard tab='bp'/>
            <Card>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:8,flexWrap:'wrap'}}>
                <Label>Blood Pressure</Label>
                <Badge label="Not a medical device" color="#4D9EFF" bg="rgba(77,158,255,0.12)"/>
              </div>
              {(l.bpSystolic!=null&&l.bpDiastolic!=null)?(()=>{
                // American Heart Association categories
                const sys=Math.round(l.bpSystolic), dia=Math.round(l.bpDiastolic)
                const cat = sys>180||dia>120 ? {t:'Hypertensive crisis — seek care',c:T.red}
                  : sys>=140||dia>=90 ? {t:'High · Stage 2',c:T.red}
                  : sys>=130||dia>=80 ? {t:'High · Stage 1',c:'#FF9F0A'}
                  : sys>=120 ? {t:'Elevated',c:T.yellow}
                  : {t:'Normal',c:T.green}
                return(<>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:12}}>
                    {[['SYSTOLIC',sys],['DIASTOLIC',dia]].map(([t,v])=>(
                      <div key={t} style={{textAlign:'center',background:'rgba(255,255,255,0.04)',borderRadius:14,padding:'20px',border:`1px solid ${cat.c}33`}}>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:4}}>{t}</div>
                        <div style={{fontSize:48,fontWeight:900,color:cat.c,lineHeight:1}}>{v}</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.55)'}}>mmHg</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:cat.c,marginBottom:4}}>{cat.t}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>Latest cuff reading synced to Apple Health{l.bpDate?` (${l.bpDate})`:''}. Categories follow American Heart Association guidelines; one reading isn't a diagnosis — talk to a doctor about repeated high readings.</div>
                </>)
              })():(
                <>
                  <DataGapNotice needs={['Blood Pressure (Systolic & Diastolic)']}
                    note="Your Apple Watch can't measure blood pressure, so we won't guess a number. Use any Bluetooth BP cuff that syncs to Apple Health (Omron, Withings, etc.) or add readings manually in the Health app → Browse → Heart → Blood Pressure. Then include Blood Pressure when you export."/>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',lineHeight:1.6,textAlign:'center',marginTop:-4}}>
                    Some newer Apple Watch models can send a hypertension <i>notification</i> — that's a yes/no alert, not a reading.
                  </div>
                </>
              )}
            </Card>
            <Card>
              <Label>Heart Trend<InfoTip text="Resting heart rate over the months in your export. A resting heart rate that drifts upward over months can go with rising blood pressure, poor sleep or stress; a falling one usually reflects better fitness. It does not tell you your blood pressure."/></Label>
              {heartTrendData.length>=2?(()=>{
                const first=heartTrendData[0], last=heartTrendData[heartTrendData.length-1]
                const diff=+(last.value-first.value).toFixed(1)
                const c=diff<=-1?T.green:diff>=2?T.red:diff>=1?T.yellow:'rgba(255,255,255,0.8)'
                const msg=diff<=-1?'Your resting heart rate has come down — a good sign for heart health and fitness.'
                  :diff>=2?'Your resting heart rate has crept up. Worth watching alongside sleep and stress; a cuff reading will tell you about blood pressure.'
                  :'Your resting heart rate has been steady.'
                return(<>
                  <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:4,flexWrap:'wrap'}}>
                    <div style={{fontSize:30,fontWeight:900,color:c}}>{diff>0?'+':''}{diff} bpm</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>{first.month} → {last.month}</div>
                  </div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.65)',marginBottom:10,lineHeight:1.5}}>{msg}</div>
                  <ChartBox height={140}>
                    <LineChart data={heartTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                      <XAxis dataKey="month" tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                      <YAxis domain={[dm=>Math.floor(dm-3),dm=>Math.ceil(dm+3)]} allowDecimals={false} tickFormatter={v=>Math.round(v)} tick={{fontSize:9,fill:'rgba(255,255,255,0.4)'}}/>
                      <TT formatter={v=>[`${v} bpm`]}/>
                      <Line type="monotone" dataKey="value" stroke="#FF3B5C" strokeWidth={2} dot={{r:3}} name="RHR"/>
                    </LineChart>
                  </ChartBox>
                </>)
              })():(
                <DataGapNotice compact needs={['Resting Heart Rate (2+ months)']}/>
              )}
            </Card>
          </div>
        )}
      </>)}

        {tab==='nutrition'&&(
          <div style={{display:'grid',gap:14}}>
            <FeatureGate feature="nutrition" tabForAffiliate="nutrition" title="Unlock Nutrition tracking">
            <AffiliateInlineCard tab='nutrition'/>

            <Card>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:4}}>
                <div>
                  <Label style={{marginBottom:4}}>Today</Label>
                  <div style={{fontSize:30,fontWeight:900,color:'#FFD60A',lineHeight:1}}>
                    {nutriDayTotals.calories}<span style={{fontSize:14,color:'rgba(255,255,255,0.70)',fontWeight:600}}> / {NUTRI_GOAL} kcal</span>
                  </div>
                </div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.70)'}}>{nutriLog.length} meal{nutriLog.length!==1?'s':''} logged</div>
              </div>
              {nutriEditingGoal?(
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <input type="number" defaultValue={NUTRI_GOAL} autoFocus
                    onKeyDown={e=>{if(e.key==='Enter')saveNutriGoal(e.target.value)}}
                    id="nutriGoalInput"
                    style={{width:90,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.20)',borderRadius:8,padding:'6px 8px',color:'#fff',fontSize:13,outline:'none'}}/>
                  <button onClick={()=>saveNutriGoal(document.getElementById('nutriGoalInput').value)}
                    style={{background:'#00FF88',color:'#000',border:'none',borderRadius:8,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>Save</button>
                  {nutriGoalOverride!=null&&nutriSuggestedGoal&&(
                    <button onClick={resetNutriGoalToSuggested}
                      style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:11,cursor:'pointer',textDecoration:'underline'}}>Use suggested ({nutriSuggestedGoal})</button>
                  )}
                  <button onClick={()=>setNutriEditingGoal(false)}
                    style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:11,cursor:'pointer'}}>Cancel</button>
                </div>
              ):(
                <div onClick={()=>setNutriEditingGoal(true)} style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:10,cursor:'pointer',textDecoration:'underline dotted'}}>
                  {nutriGoalLabel} · tap to edit
                </div>
              )}
              <div style={{background:'rgba(255,255,255,0.08)',borderRadius:99,height:6,marginBottom:14}}>
                <div style={{width:`${nutriGoalPct}%`,height:'100%',background:nutriGoalPct>100?'#FF3B5C':'#FFD60A',borderRadius:99,transition:'width 0.5s'}}/>
              </div>
              <div style={{display:'flex',gap:14}}>
                <MacroBar label="Protein" grams={nutriDayTotals.protein} color="#4D9EFF" maxGrams={150}/>
                <MacroBar label="Carbs" grams={nutriDayTotals.carbs} color="#FFD60A" maxGrams={250}/>
                <MacroBar label="Fat" grams={nutriDayTotals.fat} color="#BF5AF2" maxGrams={100}/>
              </div>
            </Card>

            <Card>
              <Label>Log a meal</Label>
              {!nutriPhoto?(
                <div onClick={()=>nutriFileRef.current?.click()}
                  style={{border:'2px dashed rgba(255,255,255,0.20)',borderRadius:14,padding:'36px 16px',textAlign:'center',cursor:'pointer'}}>
                  <div style={{fontSize:30,marginBottom:10}}>📷</div>
                  <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Drop a meal photo here</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.70)'}}>or tap to take a photo / choose from library</div>
                  <input ref={nutriFileRef} type="file" accept="image/*"
                    onChange={e=>handleNutriFile(e.target.files?.[0])} style={{display:'none'}}/>
                </div>
              ):(
                <>
                  <div style={{position:'relative',borderRadius:12,overflow:'hidden',marginBottom:14}}>
                    <img src={nutriPhoto} alt="meal" style={{width:'100%',display:'block',maxHeight:220,objectFit:'cover'}}/>
                    <button onClick={nutriReset} style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.6)',border:'none',borderRadius:99,padding:'6px 10px',cursor:'pointer',color:'#fff',fontSize:11}}>↺ Retake</button>
                  </div>

                  {nutriAnalyzing&&(
                    <div style={{display:'flex',alignItems:'center',gap:10,padding:'16px 4px',color:'rgba(255,255,255,0.70)'}}>
                      <span style={{fontSize:16}}>⏳</span><span style={{fontSize:13}}>Analyzing your meal…</span>
                    </div>
                  )}

                  {nutriError&&(
                    <div style={{fontSize:12,color:'#FFD60A',background:'rgba(255,214,10,0.08)',border:'1px solid rgba(255,214,10,0.25)',borderRadius:10,padding:'10px 12px',marginBottom:12}}>
                      {nutriError}
                    </div>
                  )}

                  {!nutriAnalyzing&&(
                    <>
                      {nutriItems.map(item=>(
                        <FoodItemCard key={item.id} item={item} onUpdateScale={nutriUpdateScale} onUpdateName={nutriUpdateName} onRemove={nutriRemoveItem}/>
                      ))}

                      {nutriShowAddForm?(
                        <AddFoodItemForm onAdd={nutriAddManual} onCancel={()=>setNutriShowAddForm(false)}/>
                      ):(
                        <button onClick={()=>setNutriShowAddForm(true)}
                          style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center',background:'none',border:'1px dashed rgba(255,255,255,0.20)',borderRadius:10,padding:'10px 14px',color:'rgba(255,255,255,0.70)',fontSize:12,fontWeight:600,cursor:'pointer',marginBottom:14,width:'100%'}}>
                          + Add missed item
                        </button>
                      )}

                      {nutriItems.length>0&&(
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                          <div style={{fontSize:12,color:'rgba(255,255,255,0.70)'}}>Meal total: <b style={{color:'#FFD60A'}}>{nutriCurrentTotals.calories} kcal</b></div>
                          <button onClick={nutriLogMeal} disabled={nutriSaving}
                            style={{background:'#00FF88',color:'#000',border:'none',borderRadius:99,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:nutriSaving?'default':'pointer',opacity:nutriSaving?0.7:1}}>
                            {nutriSaving?'Saving…':'✓ Log this meal'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </Card>

            {nutriLog.length>0&&(
              <Card>
                <Label>Today's meals</Label>
                {nutriLog.map(meal=>(
                  <div key={meal.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                    {meal.photo&&<img src={meal.photo} alt="" style={{width:36,height:36,borderRadius:8,objectFit:'cover',flexShrink:0}}/>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{meal.items.map(i=>i.name).join(', ')}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.70)'}}>{meal.time}</div>
                    </div>
                    <div style={{fontSize:13,fontWeight:800,color:'#FFD60A',flexShrink:0}}>{meal.totals.calories} kcal</div>
                  </div>
                ))}
              </Card>
            )}

            <Card>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:nutriHistory&&Object.keys(nutriHistory).length>0?10:0}}>
                <Label style={{margin:0}}>Past meals (30 days)</Label>
              </div>
              {nutriHistory===null?(
                <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Loading…</div>
              ):Object.keys(nutriHistory).length===0?(
                <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Nothing logged yet — your history will build up here as you go.</div>
              ):(
                Object.keys(nutriHistory).sort().reverse().map(date=>{
                  const rows=nutriHistory[date]
                  const dayTotal=rows.reduce((s,r)=>s+(r.totals?.calories||0),0)
                  const expanded=nutriExpandedDate===date
                  return(
                    <div key={date} style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                      <div onClick={()=>setNutriExpandedDate(expanded?null:date)}
                        style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',cursor:'pointer'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:11,color:'rgba(255,255,255,0.5)',transform:expanded?'rotate(90deg)':'none',transition:'transform 0.15s',display:'inline-block'}}>▶</span>
                          <span style={{fontSize:13,fontWeight:700}}>{new Date(date+'T00:00:00').toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})}</span>
                          <span style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>({rows.length} meal{rows.length!==1?'s':''})</span>
                        </div>
                        <span style={{fontSize:13,fontWeight:800,color:'#FFD60A'}}>{dayTotal} kcal</span>
                      </div>
                      {expanded&&(
                        <div style={{paddingBottom:12}}>
                          {rows.map(r=>(
                            <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0 8px 20px'}}>
                              {r.photo_url&&<img src={r.photo_url} alt="" style={{width:40,height:40,borderRadius:8,objectFit:'cover',flexShrink:0}}/>}
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{(r.items||[]).map(i=>i.name).join(', ')}</div>
                                <div style={{fontSize:10,color:'rgba(255,255,255,0.5)'}}>{new Date(r.logged_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                              </div>
                              <div style={{fontSize:12,fontWeight:700,color:'#FFD60A',flexShrink:0}}>{r.totals?.calories||0} kcal</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </Card>

            <Card style={{border:'1px solid rgba(0,255,136,0.25)',background:'rgba(0,255,136,0.04)'}}>
              <div style={{display:'flex',gap:10}}>
                <span style={{fontSize:18,flexShrink:0}}>✨</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Feeds your AI Coach</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.70)',lineHeight:1.5}}>
                    Today's meals get added to your AI Coach's context automatically. Try asking things like <i>"did I eat enough protein for today's strain?"</i> once you've logged a few meals.
                  </div>
                </div>
              </div>
            </Card>
            </FeatureGate>
          </div>
        )}

        {tab==='ai'&&(
          <div style={{display:'grid',gap:14}}>
            <FeatureGate feature="ai" tabForAffiliate="today" title="Unlock AI Coach">
            <Card>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <Label>AI Health Coach</Label>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>
                    {AI_FREE_LIMIT-aiMsgCount>0?`${AI_FREE_LIMIT-aiMsgCount} free AI message${AI_FREE_LIMIT-aiMsgCount===1?'':'s'} left`:'Support us with a coffee ☕'}
                  </span>
                  <span style={{background:'rgba(0,255,136,0.15)',color:'#00FF88',fontSize:10,padding:'2px 8px',borderRadius:99,border:'1px solid rgba(0,255,136,0.3)'}}>Free</span>
                </div>
              </div>
              <div ref={chatRef} style={{height:340,overflowY:'auto',display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
                {chat.map((msg,i)=>(
                  <div key={i}>
                    <div style={{display:'flex',gap:10,justifyContent:msg.role==='user'?'flex-end':'flex-start'}}>
                      {msg.role==='ai'&&<div style={{width:26,height:26,borderRadius:99,background:'rgba(0,255,136,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>✨</div>}
                      <div style={{maxWidth:'78%',background:msg.role==='ai'?'rgba(255,255,255,0.05)':'rgba(0,255,136,0.15)',border:`1px solid ${msg.role==='ai'?'rgba(255,255,255,0.08)':'rgba(0,255,136,0.3)'}`,borderRadius:14,padding:'10px 14px',fontSize:12,color:'rgba(255,255,255,0.88)',lineHeight:1.7}}>
                        {msg.text}
                      </div>
                    </div>
                    {msg.role==='ai'&&msg.pendingMeal&&(
                      <div style={{marginLeft:36,marginTop:8,background:'rgba(0,255,136,0.06)',border:'1px solid rgba(0,255,136,0.25)',borderRadius:12,padding:'10px 12px',maxWidth:'78%'}}>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginBottom:6}}>📥 Log this to Nutrition?</div>
                        {msg.pendingMeal.map((it,j)=>(
                          <div key={j} style={{fontSize:11,color:'rgba(255,255,255,0.8)',display:'flex',justifyContent:'space-between'}}>
                            <span>{it.name}</span><span style={{color:'#FFD60A',fontWeight:700}}>{it.calories} kcal</span>
                          </div>
                        ))}
                        <div style={{display:'flex',gap:8,marginTop:8}}>
                          <button onClick={()=>confirmChatMealLog(i,msg.pendingMeal)}
                            style={{background:'#00FF88',color:'#000',border:'none',borderRadius:8,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>✓ Confirm & log</button>
                          <button onClick={()=>setChat(h=>h.map((m,idx)=>idx===i?{...m,pendingMeal:null}:m))}
                            style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:11,cursor:'pointer'}}>Dismiss</button>
                        </div>
                      </div>
                    )}
                    {msg.role==='ai'&&msg.mealLogged&&(
                      <div style={{marginLeft:36,marginTop:6,fontSize:11,color:'#00FF88'}}>✓ Logged to Nutrition</div>
                    )}
                    {msg.role==='ai'&&i>0&&<AffiliateAICard msgIndex={i}/>}
                  </div>
                ))}
                {chatLoading&&<div style={{display:'flex',gap:10}}><div style={{width:26,height:26,borderRadius:99,background:'rgba(0,255,136,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>✨</div><div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'10px 14px',fontSize:12,color:'rgba(255,255,255,0.45)'}}>Analysing your data…</div></div>}
              </div>
              {!nutritionOnly&&(
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                  {[
                    ['📅 Plan my week','Plan my next 7 days. For each day give one line: hard / moderate / easy / rest training (suggest which of my usual sports), a sleep target and bedtime. Base it on my readiness, training load, sleep debt, streaks and check-ins, and say in one sentence why.'],
                    ['🏋️ Train hard today?','Should I train hard today? Answer yes / go easy / rest first, then explain in 2-3 sentences using my readiness, training load and last night\'s sleep.'],
                    ['😴 Fix my sleep','What is the single biggest thing I can change to sleep better this week? Use my sleep need, sleep debt, bedtimes, habits and check-ins.'],
                  ].map(([label,prompt])=>(
                    <button key={label} disabled={chatLoading} onClick={()=>handleAsk(prompt)}
                      style={{padding:'6px 12px',borderRadius:99,fontSize:11,fontWeight:700,cursor:'pointer',border:'1px solid rgba(0,255,136,0.35)',background:'rgba(0,255,136,0.08)',color:'#00FF88'}}>{label}</button>
                  ))}
                </div>
              )}
              <div style={{display:'flex',gap:10}}>
                <input value={askInput} onChange={e=>setAskInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!chatLoading&&handleAsk()}
                  placeholder="Ask about your sleep, readiness, heart health…"
                  style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:99,padding:'10px 18px',color:'#fff',fontSize:12,outline:'none'}}/>
                <button onClick={handleAsk} disabled={chatLoading}
                  style={{padding:'10px 20px',borderRadius:99,border:'none',cursor:'pointer',background:chatLoading?'rgba(255,255,255,0.1)':'#00FF88',color:chatLoading?'rgba(255,255,255,0.4)':'#000',fontWeight:700,fontSize:12}}>
                  {chatLoading?'…':'Ask'}
                </button>
              </div>
            </Card>
            <Card>
              <Label>Quick Prompts</Label>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {['Why is my HRV low?','Should I work out today?','How do I improve sleep?',
                  'What does my VO2 trend mean?','Explain my SpO2 dips','Am I overtraining?'].map(p=>(
                  <button key={p} onClick={()=>setAskInput(p)}
                    style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:99,padding:'7px 14px',fontSize:11,color:'rgba(255,255,255,0.70)',cursor:'pointer',fontWeight:600}}>
                    {p}
                  </button>
                ))}
              </div>
            </Card>
            </FeatureGate>
          </div>
        )}

      </div>
      <AffiliateBanner/>
    </div>
  )
}
