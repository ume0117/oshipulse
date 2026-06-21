"use client";
import { useState, useEffect, useCallback } from "react";

const I18N = {
  ja: {
    searchPlaceholder:"キーワード または @handle で検索",
    searchBtn:"検索",
    tabFeed:"フィード",
    tabPosts:"投稿",
    tabUsers:"アカウント",
    radar:"推しレーダー",
    prediction:"次の投稿予測",
    predictionSub:"約 2時間後に投稿の予測",
    mood:"今週の推しムード",
    moodDays:["月","火","水","木","金","土","日"],
    themeAuto:"自動", themeDark:"ダーク", themeLight:"ライト",
    loading:"読み込み中...", noResults:"見つかりませんでした", error:"エラーが発生しました",
    notifyBanner:"推しの新着投稿をリアルタイムで受け取ろう",
    notifyOn:"🔔 通知をオンにする", notifyOff:"🔕 オフ", notifyDone:"✅ 通知ON",testNotify:"テスト",
    login:"ログイン", logout:"ログアウト",
    loginTitle:"Blueskyでログイン",
    handleLabel:"ハンドル (例: you.bsky.social)",
    passLabel:"アプリパスワード",
    loginBtn:"ログイン", loginNote:"※ 通常パスワードではなくアプリパスワードを使用",
    loginError:"ログインに失敗しました",
    myOshi:"マイ推しリスト", oshiPlaceholder:"推しのhandle", addBtn:"追加",
    viewPosts:"投稿を見る", addOshi:"推しに追加", added:"✅ 追加済み",
  },
  en: {
    searchPlaceholder:"Keyword or @handle to search",
    searchBtn:"Search",
    tabFeed:"Feed",
    tabPosts:"Posts",
    tabUsers:"Users",
    radar:"Oshi Radar",
    prediction:"Next Post Prediction",
    predictionSub:"Expected in about 2 hours",
    mood:"This Week's Mood",
    moodDays:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    themeAuto:"Auto", themeDark:"Dark", themeLight:"Light",
    loading:"Loading...", noResults:"No results found", error:"Something went wrong",
    notifyBanner:"Get real-time alerts for your oshi",
    notifyOn:"🔔 Enable", notifyOff:"🔕 Off", notifyDone:"✅ On", testNotify:"Test",
    login:"Login", logout:"Logout",
    loginTitle:"Login with Bluesky",
    handleLabel:"Handle (e.g. you.bsky.social)",
    passLabel:"App Password",
    loginBtn:"Login", loginNote:"※ Use App Password, not your regular password",
    loginError:"Login failed",
    myOshi:"My Oshi List", oshiPlaceholder:"Oshi handle", addBtn:"Add",
    viewPosts:"View Posts", addOshi:"Add Oshi", added:"✅ Added",
  },
};

const DEMO_CREATORS = [
  { name:"Yume / 夢", handle:"yumeartist", av:"YU", color:"#3b82f6", activity:95 },
  { name:"Nova ✦",    handle:"nova.illus", av:"NO", color:"#a855f7", activity:78 },
  { name:"Stellar",   handle:"stellarworks",av:"SW",color:"#10b981", activity:42 },
  { name:"pixel hana",handle:"pixel.hana", av:"PH", color:"#f59e0b", activity:61 },
];

interface Post  { uri:string; author:{handle:string;displayName?:string;avatar?:string;}; record:{text:string;createdAt:string;}; likeCount:number; repostCount:number; embed?:{images?:{thumb:string;}[];}; }
interface Actor { did:string; handle:string; displayName?:string; avatar?:string; description?:string; }
interface User  { id:string; handle:string; did:string; displayName?:string; avatar?:string; accessJwt:string; }

const ago=(s:string,lang:"ja"|"en")=>{
  const d=Math.floor((Date.now()-new Date(s).getTime())/1000);
  if(lang==="ja"){if(d<60)return d+"秒前";if(d<3600)return Math.floor(d/60)+"分前";if(d<86400)return Math.floor(d/3600)+"時間前";return Math.floor(d/86400)+"日前";}
  else{if(d<60)return d+"s ago";if(d<3600)return Math.floor(d/60)+"m ago";if(d<86400)return Math.floor(d/3600)+"h ago";return Math.floor(d/86400)+"d ago";}
};
const ini=(s:string)=>s.slice(0,2).toUpperCase();
const COLS=["#3b82f6","#a855f7","#10b981","#f59e0b","#ef4444","#06b6d4","#8b5cf6","#f97316"];
const col=(h:string)=>{let x=0;for(const c of h)x=(x*31+c.charCodeAt(0))%COLS.length;return COLS[Math.abs(x)];};
const toUint8=(b:string)=>{const p="=".repeat((4-b.length%4)%4);const r=(b+p).replace(/-/g,"+").replace(/_/g,"/");return new Uint8Array([...window.atob(r)].map(c=>c.charCodeAt(0)));};

export default function OshiPulse() {
  const [theme,setTheme]       = useState<"auto"|"dark"|"light">("auto");
  const [sysDark,setSysDark]   = useState(false);
  const [lang,setLang]         = useState<"ja"|"en">("ja");
  const [query,setQuery]       = useState("");
  const [tab,setTab]           = useState(0);
  const [pulse,setPulse]       = useState(true);
  const [posts,setPosts]       = useState<Post[]>([]);
  const [actors,setActors]     = useState<Actor[]>([]);
  const [loading,setLoading]   = useState(false);
  const [err,setErr]           = useState("");
  const [liked,setLiked]       = useState<Record<string,boolean>>({});
  const [sub,setSub]           = useState<PushSubscription|null>(null);
  const [notif,setNotif]       = useState<"idle"|"on"|"off">("idle");
  const [user,setUser]         = useState<User|null>(null);
  const [showLogin,setShowLogin]= useState(false);
  const [lHandle,setLHandle]   = useState("");
  const [lPass,setLPass]       = useState("");
  const [lLoading,setLLoading] = useState(false);
  const [lErr,setLErr]         = useState("");
  const [oshiHandle,setOshiHandle]= useState("");
  const [oshiList,setOshiList] = useState<string[]>([]);

  useEffect(()=>{
    setSysDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    const mq=window.matchMedia("(prefers-color-scheme: dark)");
    const h=(e:MediaQueryListEvent)=>setSysDark(e.matches);
    mq.addEventListener("change",h);
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/sw.js").then(r=>{
        r.pushManager.getSubscription().then(s=>{if(s){setSub(s);setNotif("on");}});
      });
    }
    const u=localStorage.getItem("oshipulse_user");
    if(u)setUser(JSON.parse(u));
    const o=localStorage.getItem("oshipulse_oshi");
    if(o)setOshiList(JSON.parse(o));
    return()=>mq.removeEventListener("change",h);
  },[]);

  useEffect(()=>{const t=setInterval(()=>setPulse(p=>!p),1200);return()=>clearInterval(t);},[]);
  useEffect(()=>{fetchPosts("art");},[]);

  const dark=theme==="auto"?sysDark:theme==="dark";
  const cycleTheme=useCallback(()=>setTheme(t=>t==="auto"?"dark":t==="dark"?"light":"auto"),[]);
  const t=I18N[lang];

  // ── colors ──
  const bg         = dark?"#08090f":"#f4f3f0";
  const surface    = dark?"#0f1117":"#ffffff";
  const surfaceAlt = dark?"#161820":"#f0eeeb";
  const border     = dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.09)";
  const txt        = dark?"#f0f0f0":"#111111";
  const muted      = dark?"#6b7280":"#888888";
  const accent     = "#3b82f6";
  const neon       = "#00e5a0";
  const neonDim    = dark?"rgba(0,229,160,0.09)":"rgba(0,180,130,0.09)";
  const neonBdr    = dark?"rgba(0,229,160,0.35)":"rgba(0,160,110,0.35)";
  const neonTxt    = dark?"#00e5a0":"#007a5e";

  // ── fetch ──
  const fetchPosts=async(q:string,author=false)=>{
    if(!q.trim())return;
    setLoading(true);setErr("");
    try{
      const url=author?`/api/bluesky?q=${encodeURIComponent(q)}&type=author`:`/api/bluesky?q=${encodeURIComponent(q)}`;
      const r=await fetch(url);const d=await r.json();
      if(d.posts){setPosts(d.posts);setTab(1);}else setErr("none");}
    catch{setErr("err");}finally{setLoading(false);}
  };
  const fetchActors=async(q:string)=>{
    if(!q.trim())return;
    setLoading(true);setErr("");
    try{const r=await fetch(`/api/users?q=${encodeURIComponent(q)}`);const d=await r.json();if(d.actors){setActors(d.actors);setTab(2);}else setErr("none");}
    catch{setErr("err");}finally{setLoading(false);}
  };
  const handleSearch=()=>{
    if(!query.trim())return;
    if(query.startsWith("@")||tab===2)fetchActors(query.replace(/^@/,""));
    else fetchPosts(query);
  };

  // ── auth ──
  const doLogin=async()=>{
    setLLoading(true);setLErr("");
    try{
      const r=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({handle:lHandle,password:lPass})});
      const d=await r.json();
      if(d.ok){setUser(d.user);localStorage.setItem("oshipulse_user",JSON.stringify(d.user));setShowLogin(false);setLHandle("");setLPass("");}
      else setLErr(t.loginError);
    }catch{setLErr(t.loginError);}finally{setLLoading(false);}
  };
  const doLogout=()=>{setUser(null);localStorage.removeItem("oshipulse_user");};

  // ── oshi ──
  const addOshi=(h:string)=>{
    const handle=h.replace(/^@/,"").trim();
    if(!handle||oshiList.includes(handle))return;
    const next=[...oshiList,handle];
    setOshiList(next);localStorage.setItem("oshipulse_oshi",JSON.stringify(next));
  };
  const removeOshi=(h:string)=>{
    const next=oshiList.filter(x=>x!==h);
    setOshiList(next);localStorage.setItem("oshipulse_oshi",JSON.stringify(next));
  };

  // ── push ──
  const enablePush=async()=>{
    try{
      const reg=await navigator.serviceWorker.ready;
      const s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:toUint8(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!).buffer as ArrayBuffer});
      setSub(s);setNotif("on");
      await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subscription:s,userId:user?.id})}).catch(()=>{});
    }catch{setNotif("off");}
  };
  const disablePush=async()=>{if(sub){await sub.unsubscribe();setSub(null);setNotif("idle");}};
  const testPush=async()=>{
    if(!sub)return;
    await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({subscription:sub,title:"OshiPulse 🎉",body:lang==="ja"?"推しの新着投稿があります！":"Your oshi just posted!",url:"/"})});
  };

  const themeIcon=theme==="auto"?"⚙️":theme==="dark"?"🌙":"☀️";
  const themeLabel=theme==="auto"?t.themeAuto:theme==="dark"?t.themeDark:t.themeLight;

  // ── tab styles ──
  const tabStyle=(i:number)=>({
    flex:1 as const, padding:"8px 6px", borderRadius:8, fontSize:13, fontWeight:tab===i?600:400,
    background:tab===i?accent:surface, color:tab===i?"#fff":muted,
    border:`1px solid ${tab===i?accent:border}`, cursor:"pointer" as const, transition:"all 0.2s",
  });

  return (
    <div style={{minHeight:"100vh",background:bg,fontFamily:"'DM Sans',sans-serif",transition:"background 0.3s"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=Space+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes nP{0%,100%{box-shadow:0 0 0 0 rgba(0,229,160,0)}50%{box-shadow:0 0 10px 2px rgba(0,229,160,0.2)}}
        @keyframes sI{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes fI{from{opacity:0}to{opacity:1}}
        .pc{animation:sI .25s ease forwards}
        .lk{background:none;border:none;cursor:pointer;transition:transform .15s}
        .lk:hover{transform:scale(1.15)}
        .ah:hover{background:${dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)"}!important}
        .sp{animation:spin .8s linear infinite;border:2px solid ${border};border-top-color:${accent};border-radius:50%;width:20px;height:20px}
        .mo{animation:fI .2s}
        input:focus{outline:none}
        button{font-family:'DM Sans',sans-serif}
      `}</style>

      {/* Login Modal */}
      {showLogin&&(
        <div className="mo" onClick={()=>setShowLogin(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:surface,borderRadius:20,padding:28,width:"100%",maxWidth:380,border:`1px solid ${border}`}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,marginBottom:4}}>
              <span style={{color:accent}}>Oshi</span><span style={{color:txt}}>Pulse</span>
            </div>
            <p style={{fontSize:13,color:muted,marginBottom:20}}>{t.loginTitle}</p>
            <label style={{fontSize:11,color:muted,display:"block",marginBottom:4}}>{t.handleLabel}</label>
            <input value={lHandle} onChange={e=>setLHandle(e.target.value)}
              style={{width:"100%",background:surfaceAlt,border:`1px solid ${border}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:txt,marginBottom:12}}/>
            <label style={{fontSize:11,color:muted,display:"block",marginBottom:4}}>{t.passLabel}</label>
            <input type="password" value={lPass} onChange={e=>setLPass(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")doLogin();}}
              style={{width:"100%",background:surfaceAlt,border:`1px solid ${border}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:txt,marginBottom:6}}/>
            <p style={{fontSize:10,color:muted,marginBottom:16}}>{t.loginNote}</p>
            {lErr&&<p style={{fontSize:12,color:"#ef4444",marginBottom:12}}>{lErr}</p>}
            <button onClick={doLogin} disabled={lLoading}
              style={{width:"100%",background:accent,color:"#fff",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:600,cursor:"pointer"}}>
              {lLoading?"...":t.loginBtn}
            </button>
            <div style={{textAlign:"center",marginTop:12}}>
              <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener noreferrer"
                style={{fontSize:11,color:accent}}>App Passwordの取得 →</a>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:surface,borderBottom:`1px solid ${border}`,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:accent}}>Oshi</span>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:txt}}>Pulse</span>
          <span style={{fontSize:9,background:neonDim,color:neonTxt,border:`1px solid ${neonBdr}`,padding:"2px 7px",borderRadius:20,fontFamily:"'Space Mono',monospace",marginLeft:2}}>BETA</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setLang(l=>l==="ja"?"en":"ja")}
            style={{background:surfaceAlt,border:`1px solid ${border}`,borderRadius:20,padding:"3px 10px",fontSize:11,color:muted,cursor:"pointer",fontFamily:"'Space Mono',monospace"}}>
            {lang==="ja"?"EN":"日本語"}
          </button>
          <div style={{position:"relative",cursor:"pointer"}} onClick={notif==="on"?testPush:enablePush}>
            <span style={{fontSize:16}}>🔔</span>
            <div style={{position:"absolute",top:-2,right:-2,width:7,height:7,background:notif==="on"?neon:border,borderRadius:"50%",border:`1.5px solid ${surface}`,opacity:notif==="on"?(pulse?1:0.3):0.5,transition:"opacity 0.4s"}}/>
          </div>
          <button onClick={cycleTheme}
            style={{background:surfaceAlt,border:`1px solid ${border}`,borderRadius:20,padding:"3px 10px",fontSize:11,color:muted,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            <span>{themeIcon}</span><span style={{display:"none"}}>{themeLabel}</span>
          </button>
          {user?(
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {user.avatar?<img src={user.avatar} alt="" style={{width:28,height:28,borderRadius:"50%",objectFit:"cover"}}/>:
                <div style={{width:28,height:28,borderRadius:"50%",background:accent+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:accent}}>{ini(user.handle)}</div>}
              <button onClick={doLogout}
                style={{background:surfaceAlt,border:`1px solid ${border}`,borderRadius:20,padding:"3px 10px",fontSize:11,color:muted,cursor:"pointer"}}>
                {t.logout}
              </button>
            </div>
          ):(
            <button onClick={()=>setShowLogin(true)}
              style={{background:accent,color:"#fff",border:"none",borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:500,cursor:"pointer"}}>
              {t.login}
            </button>
          )}
        </div>
      </div>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"0 16px"}}>

        {/* Notify Banner */}
        {notif==="idle"&&(
          <div style={{margin:"12px 0",background:neonDim,border:`1px solid ${neonBdr}`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <span style={{fontSize:13,color:neonTxt}}>{t.notifyBanner}</span>
            <button onClick={enablePush}
              style={{background:neon,color:"#000",fontSize:12,fontWeight:700,padding:"7px 16px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>
              {t.notifyOn}
            </button>
          </div>
        )}
        {notif==="on"&&(
          <div style={{margin:"12px 0",background:surface,border:`1px solid ${neonBdr}`,borderRadius:12,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:neonTxt}}>{t.notifyDone}</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={testPush} style={{background:accent,color:"#fff",fontSize:11,padding:"5px 12px",borderRadius:16,border:"none",cursor:"pointer"}}>{t.testNotify}</button>
              <button onClick={disablePush} style={{background:surfaceAlt,color:muted,fontSize:11,padding:"5px 12px",borderRadius:16,border:`1px solid ${border}`,cursor:"pointer"}}>{t.notifyOff}</button>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{padding:"12px 0"}}>
          <div style={{background:surface,border:`1px solid ${border}`,borderRadius:14,display:"flex",alignItems:"center",gap:10,padding:"10px 16px"}}>
            <span style={{fontSize:16,color:muted}}>🔍</span>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")handleSearch();}}
              placeholder={t.searchPlaceholder}
              style={{flex:1,background:"transparent",border:"none",fontSize:14,color:txt,minWidth:0}}/>
            <button onClick={handleSearch}
              style={{background:accent,color:"#fff",fontSize:12,padding:"6px 16px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>
              {loading?"⏳":t.searchBtn}
            </button>
          </div>
        </div>

        {/* Layout: 2-col on wide, 1-col on narrow */}
        <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>

          {/* Main */}
          <div style={{flex:1,minWidth:0}}>

            {/* Tabs */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              <button style={tabStyle(0)} onClick={()=>setTab(0)}>{t.tabFeed}</button>
              <button style={tabStyle(1)} onClick={()=>setTab(1)}>{t.tabPosts}</button>
              <button style={tabStyle(2)} onClick={()=>setTab(2)}>{t.tabUsers}</button>
            </div>

            {/* Loading */}
            {loading&&<div style={{display:"flex",justifyContent:"center",padding:"40px 0"}}><div className="sp"/></div>}
            {!loading&&err&&<div style={{textAlign:"center",padding:"40px 0",color:muted,fontSize:13}}>{t.noResults}</div>}

            {/* Account results */}
            {!loading&&!err&&tab===2&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {actors.length===0?<div style={{textAlign:"center",padding:"40px 0",color:muted}}>{t.noResults}</div>:
                  actors.map(a=>{
                    const name=a.displayName||a.handle;
                    const c=col(a.handle);
                    const isAdded=oshiList.includes(a.handle);
                    return (
                      <div key={a.did} className="pc ah"
                        style={{background:surface,border:`1px solid ${border}`,borderRadius:14,padding:"14px 16px",cursor:"pointer"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:a.description?8:10}} onClick={()=>fetchPosts(a.handle,true)}>
                          {a.avatar?<img src={a.avatar} alt="" style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>:
                            <div style={{width:44,height:44,borderRadius:"50%",background:c+"22",border:`2px solid ${c}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:c,flexShrink:0}}>{ini(name)}</div>}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:600,color:txt}}>{name}</div>
                            <div style={{fontSize:12,color:muted}}>@{a.handle}</div>
                          </div>
                        </div>
                        {a.description&&<p style={{fontSize:12,color:muted,marginBottom:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.description}</p>}
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>fetchPosts(a.handle,true)}
                            style={{flex:1,background:surfaceAlt,color:txt,border:`1px solid ${border}`,borderRadius:8,padding:"7px 0",fontSize:12,cursor:"pointer"}}>
                            {t.viewPosts}
                          </button>
                          {user&&<button onClick={()=>isAdded?removeOshi(a.handle):addOshi(a.handle)}
                            style={{flex:1,background:isAdded?surfaceAlt:neon,color:isAdded?muted:"#000",border:`1px solid ${isAdded?border:neonBdr}`,borderRadius:8,padding:"7px 0",fontSize:12,fontWeight:isAdded?400:600,cursor:"pointer"}}>
                            {isAdded?t.added:t.addOshi}
                          </button>}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* Post results */}
            {!loading&&!err&&tab!==2&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {posts.length===0?<div style={{textAlign:"center",padding:"40px 0",color:muted}}>{t.noResults}</div>:
                  posts.map((p,i)=>{
                    const name=p.author.displayName||p.author.handle;
                    const c=col(p.author.handle);
                    const imgs=p.embed?.images;
                    return (
                      <div key={p.uri} className="pc"
                        style={{animationDelay:`${i*0.03}s`,background:surface,border:`1px solid ${border}`,borderRadius:14,padding:"14px 16px"}}>
                        <div style={{display:"flex",gap:12}}>
                          {p.author.avatar?<img src={p.author.avatar} alt="" style={{width:38,height:38,borderRadius:"50%",flexShrink:0,objectFit:"cover"}}/>:
                            <div style={{width:38,height:38,borderRadius:"50%",background:c+"22",border:`2px solid ${c}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,fontWeight:700,color:c}}>{ini(name)}</div>}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,gap:8}}>
                              <div style={{minWidth:0}}>
                                <span style={{fontSize:13,fontWeight:600,color:txt}}>{name}</span>
                                <span style={{fontSize:11,color:muted,marginLeft:6}}>@{p.author.handle}</span>
                              </div>
                              <span style={{fontSize:11,color:muted,whiteSpace:"nowrap",flexShrink:0}}>{ago(p.record.createdAt,lang)}</span>
                            </div>
                            <p style={{fontSize:13,color:txt,lineHeight:1.65,marginBottom:10,wordBreak:"break-word"}}>{p.record.text}</p>
                            {imgs&&imgs.length>0&&(
                              <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                                {imgs.slice(0,2).map((im,j)=>(
                                  <img key={j} src={im.thumb} alt="" style={{width:"48%",maxHeight:160,objectFit:"cover",borderRadius:8,border:`1px solid ${border}`}}/>
                                ))}
                              </div>
                            )}
                            <div style={{display:"flex",gap:16}}>
                              <button className="lk" onClick={()=>setLiked(lk=>({...lk,[p.uri]:!lk[p.uri]}))}
                                style={{fontSize:12,color:liked[p.uri]?"#ef4444":muted,display:"flex",alignItems:"center",gap:4}}>
                                <span>{liked[p.uri]?"❤️":"🤍"}</span><span>{liked[p.uri]?p.likeCount+1:p.likeCount}</span>
                              </button>
                              <span style={{fontSize:12,color:muted,display:"flex",alignItems:"center",gap:4}}>
                                <span>🔁</span><span>{p.repostCount}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>

          {/* Sidebar - always visible */}
          <div style={{width:260,flexShrink:0,display:"flex",flexDirection:"column",gap:12}}>

            {/* Pro Upgrade */}
            {user&&(
              <div style={{background:'linear-gradient(135deg,#3b82f6,#a855f7)',borderRadius:14,padding:'14px 16px',marginBottom:0}}>
                <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.9)',letterSpacing:0,marginBottom:6}}>OshiPulse Pro</div>
                <div style={{fontSize:12,color:'#fff',marginBottom:10}}>推しの自動通知・プッシュ通知</div>
                <div style={{fontSize:20,fontWeight:800,color:'#fff',marginBottom:10}}>$5 <span style={{fontSize:12,fontWeight:400}}>/月</span></div>
                <button onClick={async()=>{
                  const r=await fetch('/api/stripe/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:user.id})});
                  const d=await r.json();
                  if(d.url)window.location.href=d.url; else alert("エラー: " + (d.error || "不明なエラー"));
                }} style={{width:'100%',background:'#fff',color:'#3b82f6',border:'none',borderRadius:10,padding:'10px',fontSize:13,fontWeight:700,cursor:'pointer',display:'block'}}>
                  今すぐ始める →
                </button>
              </div>
            )}
            {/* Oshi List */}
            {user&&(
              <div style={{background:surface,border:`1px solid ${border}`,borderRadius:14,padding:"14px 16px"}}>
                <div style={{fontSize:11,fontWeight:600,color:muted,letterSpacing:1,marginBottom:12,textTransform:"uppercase"}}>{t.myOshi}</div>
                <div style={{display:"flex",gap:6,marginBottom:oshiList.length>0?10:0}}>
                  <input value={oshiHandle} onChange={e=>setOshiHandle(e.target.value)}
                    placeholder={t.oshiPlaceholder}
                    onKeyDown={e=>{if(e.key==="Enter"){addOshi(oshiHandle);setOshiHandle("");}}}
                    style={{flex:1,background:surfaceAlt,border:`1px solid ${border}`,borderRadius:8,padding:"6px 10px",fontSize:12,color:txt,minWidth:0}}/>
                  <button onClick={()=>{addOshi(oshiHandle);setOshiHandle("");}}
                    style={{background:accent,color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    {t.addBtn}
                  </button>
                </div>
                {oshiList.map(h=>(
                  <div key={h} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 8px",background:surfaceAlt,borderRadius:8,marginBottom:6}}>
                    <span style={{fontSize:12,color:txt,cursor:"pointer"}} onClick={()=>fetchPosts(h)}>@{h}</span>
                    <button onClick={()=>removeOshi(h)} style={{background:"none",border:"none",color:muted,cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Radar */}
            <div style={{background:surface,border:`1px solid ${border}`,borderRadius:14,padding:"14px 16px"}}>
              <div style={{fontSize:11,fontWeight:600,color:muted,letterSpacing:1,marginBottom:12,textTransform:"uppercase"}}>{t.radar}</div>
              {DEMO_CREATORS.map(c=>(
                <div key={c.handle} className="ah"
                  onClick={()=>fetchPosts(c.handle)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:8,cursor:"pointer",marginBottom:6,transition:"background 0.15s"}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:c.color+"22",border:`2px solid ${c.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:c.color,flexShrink:0}}>{c.av}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,color:txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                    <div style={{height:3,background:dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)",borderRadius:2,marginTop:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${c.activity}%`,background:c.activity>80?neon:c.color,borderRadius:2}}/>
                    </div>
                  </div>
                  <span style={{fontSize:10,color:c.activity>80?neonTxt:muted,fontFamily:"'Space Mono',monospace",flexShrink:0}}>{c.activity}%</span>
                </div>
              ))}
            </div>

            {/* Prediction */}
            <div style={{background:neonDim,border:`1px solid ${neonBdr}`,borderRadius:14,padding:"14px 16px"}}>
              <div style={{fontSize:10,fontWeight:600,color:neonTxt,letterSpacing:1,marginBottom:10,textTransform:"uppercase",fontFamily:"'Space Mono',monospace"}}>{t.prediction}</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:"#3b82f622",border:"2px solid #3b82f644",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#3b82f6",flexShrink:0}}>YU</div>
                <div>
                  <div style={{fontSize:12,color:txt,fontWeight:500}}>Yume / 夢</div>
                  <div style={{fontSize:11,color:neonTxt}}>{t.predictionSub}</div>
                </div>
              </div>
            </div>

            {/* Mood */}
            <div style={{background:surface,border:`1px solid ${border}`,borderRadius:14,padding:"14px 16px",marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:600,color:muted,letterSpacing:1,marginBottom:12,textTransform:"uppercase"}}>{t.mood}</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:5,height:48}}>
                {[40,55,70,60,85,90,75].map((h,i)=>(
                  <div key={i} style={{flex:1,height:`${h}%`,background:h>80?neon:(dark?"#1e3a5f":"#dbeafe"),borderRadius:3}}/>
                ))}
              </div>
              <div style={{display:"flex",marginTop:6}}>
                {t.moodDays.map(d=>(<span key={d} style={{fontSize:10,color:muted,flex:1,textAlign:"center"}}>{d}</span>))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
