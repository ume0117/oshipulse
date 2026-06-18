"use client";
import { useState, useEffect, useCallback } from "react";

const I18N = {
  ja: {
    search: "クリエイターやキーワードを検索...",
    searchBtn: "検索",
    tabs: ["フィード", "アラート (2)", "カレンダー"],
    radar: "推しレーダー",
    prediction: "次の投稿予測",
    predictionSub: "約 2時間後に投稿の予測",
    mood: "今週の推しムード",
    moodDays: ["月","火","水","木","金","土","日"],
    themeAuto: "自動", themeDark: "ダーク", themeLight: "ライト",
  },
  en: {
    search: "Search creators or keywords on Bluesky...",
    searchBtn: "Search",
    tabs: ["Feed", "Alerts (2)", "Calendar"],
    radar: "Oshi Radar",
    prediction: "Next Post Prediction",
    predictionSub: "Expected in about 2 hours",
    mood: "This Week's Mood",
    moodDays: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    themeAuto: "Auto", themeDark: "Dark", themeLight: "Light",
  },
};

const POSTS = [
  { id:1, handle:"@yumeartist.bsky.social", name:"Yume / 夢", avatar:"YU", avatarColor:"#3b82f6",
    time:{ja:"2分前",en:"2m ago"},
    text:{ja:"新作グッズの販売を開始しました！アクリルキーホルダー＆缶バッジセット🎨 BOOTHにて受付中です",en:"New merch is now on sale! Acrylic keychain & pin badge set 🎨 Available on BOOTH now!"},
    likes:142, reposts:38, isAlert:true, alertText:"SALE DETECTED" },
  { id:2, handle:"@nova.illustrator.bsky.social", name:"Nova ✦", avatar:"NO", avatarColor:"#a855f7",
    time:{ja:"14分前",en:"14m ago"},
    text:{ja:"今夜21時からツイキャスで生配信します！イラストメイキングやります〜遊びに来てね",en:"Going live tonight at 9PM on TwitCasting! Illustration speed-drawing — come hang out!"},
    likes:89, reposts:21, isAlert:true, alertText:"LIVE SOON" },
  { id:3, handle:"@stellarworks.bsky.social", name:"Stellar Works", avatar:"SW", avatarColor:"#10b981",
    time:{ja:"1時間前",en:"1h ago"},
    text:{ja:"スケッチブックのページを全部埋めた。達成感がすごい。次は何を描こうかな",en:"Filled every page of my sketchbook. Such a great feeling. What should I draw next?"},
    likes:203, reposts:44, isAlert:false, alertText:"" },
  { id:4, handle:"@pixel.hana.bsky.social", name:"pixel hana", avatar:"PH", avatarColor:"#f59e0b",
    time:{ja:"3時間前",en:"3h ago"},
    text:{ja:"@nova.illustrator とのコラボ企画、今週末に発表します👀 お楽しみに！",en:"Collaboration with @nova.illustrator — something big is coming this weekend 👀"},
    likes:317, reposts:92, isAlert:false, alertText:"" },
];

const CREATORS = [
  { name:"Yume / 夢",     handle:"@yumeartist",   avatar:"YU", color:"#3b82f6", activity:95 },
  { name:"Nova ✦",        handle:"@nova.illus",   avatar:"NO", color:"#a855f7", activity:78 },
  { name:"Stellar Works", handle:"@stellarworks", avatar:"SW", color:"#10b981", activity:42 },
  { name:"pixel hana",    handle:"@pixel.hana",   avatar:"PH", color:"#f59e0b", activity:61 },
];

export default function SkyDeck() {
  const getSystemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [themeMode, setThemeMode]   = useState<"auto"|"dark"|"light">("auto");
  const [systemDark, setSystemDark] = useState(false);
  const [lang, setLang]             = useState<"ja"|"en">("ja");
  const [query, setQuery]           = useState("");
  const [activeTab, setActiveTab]   = useState(0);
  const [alertPulse, setAlertPulse] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Record<number,boolean>>({});

  useEffect(() => {
    setSystemDark(getSystemDark());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setAlertPulse(p => !p), 1200);
    return () => clearInterval(t);
  }, []);

  const dark = themeMode === "auto" ? systemDark : themeMode === "dark";
  const cycleTheme = useCallback(() => {
    setThemeMode(m => m === "auto" ? "dark" : m === "dark" ? "light" : "auto");
  }, []);

  const t = I18N[lang];
  const d = dark;
  const bg          = d ? "#08090f" : "#f4f3f0";
  const surface     = d ? "#0f1117" : "#ffffff";
  const surfaceAlt  = d ? "#161820" : "#f9f8f6";
  const border      = d ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const borderStrong= d ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.14)";
  const text        = d ? "#f0f0f0" : "#111111";
  const textMuted   = d ? "#6b7280" : "#888888";
  const accent      = "#3b82f6";
  const neon        = "#00e5a0";
  const neonDim     = d ? "rgba(0,229,160,0.08)" : "rgba(0,180,130,0.08)";
  const neonBorder  = d ? "rgba(0,229,160,0.35)" : "rgba(0,160,110,0.35)";
  const neonText    = d ? "#00e5a0" : "#007a5e";
  const themeLabel  = themeMode === "auto" ? t.themeAuto : themeMode === "dark" ? t.themeDark : t.themeLight;
  const themeIcon   = themeMode === "auto" ? "⚙️" : themeMode === "dark" ? "🌙" : "☀️";
  const toggleLike  = (id: number) => setLikedPosts(p => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ minHeight:"100vh", background:bg, fontFamily:"'DM Sans',sans-serif", transition:"background 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=Space+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes neonPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,229,160,0)}50%{box-shadow:0 0 12px 2px rgba(0,229,160,0.25)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .post-card{animation:slideIn 0.3s ease forwards}
        .alert-card{animation:neonPulse 2s ease infinite}
        .like-btn{transition:transform 0.15s;background:none;border:none;cursor:pointer}
        .like-btn:hover{transform:scale(1.15)}
        .creator-row:hover{background:${d?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"}}
        .ctrl-btn{transition:opacity 0.15s;cursor:pointer}
        .ctrl-btn:hover{opacity:0.7}
        .tab-btn{transition:all 0.2s;cursor:pointer;border:none}
      `}</style>

      {/* ヘッダー */}
      <div style={{ background:surface, borderBottom:`0.5px solid ${border}`, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:52, position:"sticky", top:0, zIndex:100, transition:"background 0.3s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:accent }}>Sky</span>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:text }}>Deck</span>
          <span style={{ fontSize:10, background:neonDim, color:neonText, border:`0.5px solid ${neonBorder}`, padding:"2px 7px", borderRadius:20, fontFamily:"'Space Mono',monospace", marginLeft:4 }}>BETA</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button className="ctrl-btn" onClick={() => setLang(l => l==="ja"?"en":"ja")}
            style={{ background:surfaceAlt, border:`0.5px solid ${border}`, borderRadius:20, padding:"4px 12px", fontSize:12, color:textMuted, fontFamily:"'Space Mono',monospace" }}>
            {lang==="ja"?"EN":"日本語"}
          </button>
          <div style={{ position:"relative", cursor:"pointer" }}>
            <span style={{ fontSize:18 }}>🔔</span>
            <div style={{ position:"absolute", top:-2, right:-2, width:8, height:8, background:neon, borderRadius:"50%", border:`1.5px solid ${surface}`, opacity:alertPulse?1:0.3, transition:"opacity 0.4s" }} />
          </div>
          <button className="ctrl-btn" onClick={cycleTheme}
            style={{ background:surfaceAlt, border:`0.5px solid ${border}`, borderRadius:20, padding:"4px 12px", fontSize:12, color:textMuted, display:"flex", alignItems:"center", gap:6, fontFamily:"'DM Sans',sans-serif" }}>
            <span>{themeIcon}</span><span>{themeLabel}</span>
          </button>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"0 16px" }}>
        {/* 検索バー */}
        <div style={{ padding:"20px 0 16px" }}>
          <div style={{ background:surface, border:`0.5px solid ${borderStrong}`, borderRadius:12, display:"flex", alignItems:"center", gap:10, padding:"10px 16px", transition:"background 0.3s" }}>
            <span style={{ fontSize:16, color:textMuted }}>🔍</span>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}
              style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:14, color:text, fontFamily:"'DM Sans',sans-serif" }} />
            {query && <div style={{ background:accent, color:"#fff", fontSize:12, padding:"4px 14px", borderRadius:8, cursor:"pointer", fontWeight:500 }}>{t.searchBtn}</div>}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16 }}>
          {/* 左：フィード */}
          <div>
            <div style={{ display:"flex", gap:2, marginBottom:16, background:surfaceAlt, borderRadius:10, padding:3, border:`0.5px solid ${border}` }}>
              {t.tabs.map((label,i) => (
                <button key={i} className="tab-btn" onClick={() => setActiveTab(i)}
                  style={{ flex:1, padding:"7px 0", borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:activeTab===i?500:400, background:activeTab===i?surface:"transparent", color:activeTab===i?(i===1?neonText:text):textMuted, boxShadow:activeTab===i?`0 0 0 0.5px ${border}`:"none" }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {POSTS.map((post,i) => (
                <div key={post.id} className={`post-card${post.isAlert?" alert-card":""}`}
                  style={{ animationDelay:`${i*0.05}s`, background:surface, border:post.isAlert?`1px solid ${neonBorder}`:`0.5px solid ${border}`, borderRadius:14, padding:"14px 16px", transition:"background 0.3s" }}>
                  {post.isAlert && (
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                      <div style={{ width:6, height:6, background:neon, borderRadius:"50%" }} />
                      <span style={{ fontSize:10, color:neonText, fontFamily:"'Space Mono',monospace", letterSpacing:1 }}>{post.alertText}</span>
                    </div>
                  )}
                  <div style={{ display:"flex", gap:10 }}>
                    <div style={{ width:38, height:38, borderRadius:"50%", background:post.avatarColor+"22", border:`1.5px solid ${post.avatarColor}44`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:12, fontWeight:700, color:post.avatarColor }}>{post.avatar}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <div>
                          <span style={{ fontSize:13, fontWeight:500, color:text }}>{post.name}</span>
                          <span style={{ fontSize:11, color:textMuted, marginLeft:6 }}>{post.handle}</span>
                        </div>
                        <span style={{ fontSize:11, color:textMuted }}>{post.time[lang]}</span>
                      </div>
                      <p style={{ fontSize:13, color:text, lineHeight:1.6, marginBottom:10 }}>{post.text[lang]}</p>
                      <div style={{ display:"flex", gap:16 }}>
                        <button className="like-btn" onClick={() => toggleLike(post.id)}
                          style={{ fontSize:12, color:likedPosts[post.id]?"#ef4444":textMuted, display:"flex", alignItems:"center", gap:4 }}>
                          <span>{likedPosts[post.id]?"❤️":"🤍"}</span>
                          <span>{likedPosts[post.id]?post.likes+1:post.likes}</span>
                        </button>
                        <span style={{ fontSize:12, color:textMuted, display:"flex", alignItems:"center", gap:4 }}>
                          <span>🔁</span><span>{post.reposts}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右：サイドバー */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:surface, border:`0.5px solid ${border}`, borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:500, color:textMuted, letterSpacing:0.8, marginBottom:12, textTransform:"uppercase" }}>{t.radar}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {CREATORS.map(c => (
                  <div key={c.handle} className="creator-row" style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 8px", borderRadius:8, cursor:"pointer", transition:"background 0.15s" }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:c.color+"22", border:`1.5px solid ${c.color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:c.color, flexShrink:0 }}>{c.avatar}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                      <div style={{ height:3, background:d?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.07)", borderRadius:2, marginTop:4, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${c.activity}%`, background:c.activity>80?neon:c.color, borderRadius:2, transition:"width 0.8s ease" }} />
                      </div>
                    </div>
                    <span style={{ fontSize:10, color:c.activity>80?neonText:textMuted, fontFamily:"'Space Mono',monospace" }}>{c.activity}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:neonDim, border:`0.5px solid ${neonBorder}`, borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:500, color:neonText, letterSpacing:0.8, marginBottom:10, textTransform:"uppercase", fontFamily:"'Space Mono',monospace" }}>{t.prediction}</div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:"#3b82f622", border:"1.5px solid #3b82f655", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#3b82f6" }}>YU</div>
                <div>
                  <div style={{ fontSize:12, color:text, fontWeight:500 }}>Yume / 夢</div>
                  <div style={{ fontSize:11, color:neonText }}>{t.predictionSub}</div>
                </div>
              </div>
            </div>

            <div style={{ background:surface, border:`0.5px solid ${border}`, borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:500, color:textMuted, letterSpacing:0.8, marginBottom:12, textTransform:"uppercase" }}>{t.mood}</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:48 }}>
                {[40,55,70,60,85,90,75].map((h,i) => (
                  <div key={i} style={{ flex:1, height:`${h}%`, background:h>80?neon:(d?"#1e3a5f":"#dbeafe"), borderRadius:3, transition:"background 0.3s" }} />
                ))}
              </div>
              <div style={{ display:"flex", marginTop:6 }}>
                {t.moodDays.map(day => (
                  <span key={day} style={{ fontSize:10, color:textMuted, flex:1, textAlign:"center" }}>{day}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}