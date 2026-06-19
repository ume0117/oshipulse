"use client";
import { useState, useEffect, useCallback } from "react";

const I18N = {
  ja: { search:"キーワードを検索...",searchBtn:"検索",tabs:["フィード","投稿","アカウント"],radar:"推しレーダー",prediction:"次の投稿予測",predictionSub:"約 2時間後に投稿の予測",mood:"今週の推しムード",moodDays:["月","火","水","木","金","土","日"],themeAuto:"自動",themeDark:"ダーク",themeLight:"ライト",loading:"読み込み中...",noResults:"見つかりませんでした",error:"エラーが発生しました",notifyOn:"🔔 通知をオンにする",notifyOff:"🔕 通知をオフにする",notifyDone:"✅ 通知が届きます！",testNotify:"テスト通知",login:"ログイン",logout:"ログアウト",loginTitle:"Blueskyでログイン",handlePlaceholder:"ハンドル（例：you.bsky.social）",passwordPlaceholder:"アプリパスワード",loginBtn:"ログイン",loginNote:"※ アプリパスワードを使用してください",loginError:"ログインに失敗しました",addOshi:"追加",oshiPlaceholder:"推しのハンドル",myOshi:"マイ推しリスト",searchAccount:"アカウントを検索",follow:"推しに追加" },
  en: { search:"Search Bluesky...",searchBtn:"Search",tabs:["Feed","Posts","Users"],radar:"Oshi Radar",prediction:"Next Post Prediction",predictionSub:"Expected in about 2 hours",mood:"This Week's Mood",moodDays:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],themeAuto:"Auto",themeDark:"Dark",themeLight:"Light",loading:"Loading...",noResults:"No results found",error:"Something went wrong",notifyOn:"🔔 Enable Notifications",notifyOff:"🔕 Disable",notifyDone:"✅ Notifications on!",testNotify:"Test",login:"Login",logout:"Logout",loginTitle:"Login with Bluesky",handlePlaceholder:"Handle (e.g. you.bsky.social)",passwordPlaceholder:"App Password",loginBtn:"Login",loginNote:"※ Please use an App Password",loginError:"Login failed",addOshi:"Add",oshiPlaceholder:"Oshi handle",myOshi:"My Oshi List",searchAccount:"Search Accounts",follow:"Add Oshi" },
};

const CREATORS = [
  { name:"Yume / 夢",handle:"@yumeartist",avatar:"YU",color:"#3b82f6",activity:95 },
  { name:"Nova ✦",handle:"@nova.illus",avatar:"NO",color:"#a855f7",activity:78 },
  { name:"Stellar Works",handle:"@stellarworks",avatar:"SW",color:"#10b981",activity:42 },
  { name:"pixel hana",handle:"@pixel.hana",avatar:"PH",color:"#f59e0b",activity:61 },
];

interface BskyPost { uri:string; author:{handle:string;displayName?:string;avatar?:string;}; record:{text:string;createdAt:string;}; likeCount:number; repostCount:number; embed?:{images?:{thumb:string;}[];}; }
interface BskyUser { did:string; handle:string; displayName?:string; avatar?:string; description?:string; }
interface User { id:string; handle:string; did:string; displayName?:string; avatar?:string; accessJwt:string; }

function timeAgo(dateStr:string,lang:"ja"|"en"):string {
  const diff=Math.floor((Date.now()-new Date(dateStr).getTime())/1000);
  if(lang==="ja"){if(diff<60)return`${diff}秒前`;if(diff<3600)return`${Math.floor(diff/60)}分前`;if(diff<86400)return`${Math.floor(diff/3600)}時間前`;return`${Math.floor(diff/86400)}日前`;}
  else{if(diff<60)return`${diff}s ago`;if(diff<3600)return`${Math.floor(diff/60)}m ago`;if(diff<86400)return`${Math.floor(diff/3600)}h ago`;return`${Math.floor(diff/86400)}d ago`;}
}
function getInitials(name:string):string{return name.slice(0,2).toUpperCase();}
const AVATAR_COLORS=["#3b82f6","#a855f7","#10b981","#f59e0b","#ef4444","#06b6d4","#8b5cf6","#f97316"];
function getColor(handle:string):string{let hash=0;for(const c of handle)hash=(hash*31+c.charCodeAt(0))%AVATAR_COLORS.length;return AVATAR_COLORS[Math.abs(hash)];}
function urlBase64ToUint8Array(base64String:string):Uint8Array{const padding="=".repeat((4-base64String.length%4)%4);const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");const rawData=window.atob(base64);return new Uint8Array([...rawData].map(c=>c.charCodeAt(0)));}

export default function OshiPulse() {
  const [themeMode,setThemeMode]=useState<"auto"|"dark"|"light">("auto");
  const [systemDark,setSystemDark]=useState(false);
  const [isMobile,setIsMobile]=useState(false);
  const [lang,setLang]=useState<"ja"|"en">("ja");
  const [query,setQuery]=useState("");
  const [activeTab,setActiveTab]=useState(0);
  const [alertPulse,setAlertPulse]=useState(true);
  const [posts,setPosts]=useState<BskyPost[]>([]);
  const [accounts,setAccounts]=useState<BskyUser[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [likedPosts,setLikedPosts]=useState<Record<string,boolean>>({});
  const [subscription,setSubscription]=useState<PushSubscription|null>(null);
  const [notifyStatus,setNotifyStatus]=useState<"idle"|"subscribed"|"denied">("idle");
  const [user,setUser]=useState<User|null>(null);
  const [showLogin,setShowLogin]=useState(false);
  const [loginHandle,setLoginHandle]=useState("");
  const [loginPassword,setLoginPassword]=useState("");
  const [loginLoading,setLoginLoading]=useState(false);
  const [loginError,setLoginError]=useState("");
  const [oshiHandle,setOshiHandle]=useState("");
  const [oshiList,setOshiList]=useState<string[]>([]);

  useEffect(()=>{
    setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    const mq=window.matchMedia("(prefers-color-scheme: dark)");
    const handler=(e:MediaQueryListEvent)=>setSystemDark(e.matches);
    mq.addEventListener("change",handler);
    const checkMobile=()=>setIsMobile(window.innerWidth<768);
    checkMobile();
    window.addEventListener("resize",checkMobile);
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/sw.js").then(reg=>{
        reg.pushManager.getSubscription().then(sub=>{if(sub){setSubscription(sub);setNotifyStatus("subscribed");}});
      });
    }
    const savedUser=localStorage.getItem("oshipulse_user");
    if(savedUser)setUser(JSON.parse(savedUser));
    const savedOshi=localStorage.getItem("oshipulse_oshi");
    if(savedOshi)setOshiList(JSON.parse(savedOshi));
    return()=>{mq.removeEventListener("change",handler);window.removeEventListener("resize",checkMobile);};
  },[]);

  useEffect(()=>{const timer=setInterval(()=>setAlertPulse(p=>!p),1200);return()=>clearInterval(timer);},[]);
  useEffect(()=>{fetchPosts("art");},[]);

  const fetchPosts=async(q:string)=>{
    if(!q.trim())return;
    setLoading(true);setError("");
    try{
      const res=await fetch(`/api/bluesky?q=${encodeURIComponent(q)}`);
      const data=await res.json();
      if(data.posts){setPosts(data.posts);setActiveTab(1);}
      else setError("no results");
    }catch{setError("error");}
    finally{setLoading(false);}
  };

  const fetchAccounts=async(q:string)=>{
    if(!q.trim())return;
    setLoading(true);setError("");
    try{
      const res=await fetch(`/api/users?q=${encodeURIComponent(q)}`);
      const data=await res.json();
      if(data.actors){setAccounts(data.actors);setActiveTab(2);}
      else setError("no results");
    }catch{setError("error");}
    finally{setLoading(false);}
  };

  const handleSearch=()=>{
    if(!query.trim())return;
    if(activeTab===2)fetchAccounts(query);
    else fetchPosts(query);
  };
  const handleKeyDown=(e:React.KeyboardEvent)=>{if(e.key==="Enter")handleSearch();};

  const handleLogin=async()=>{
    setLoginLoading(true);setLoginError("");
    try{
      const res=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({handle:loginHandle,password:loginPassword})});
      const data=await res.json();
      if(data.ok){setUser(data.user);localStorage.setItem("oshipulse_user",JSON.stringify(data.user));setShowLogin(false);setLoginHandle("");setLoginPassword("");}
      else setLoginError(t.loginError);
    }catch{setLoginError(t.loginError);}
    finally{setLoginLoading(false);}
  };

  const handleLogout=()=>{setUser(null);localStorage.removeItem("oshipulse_user");};

  const addOshi=(handle:string)=>{
    const h=handle.replace("@","").trim();
    if(oshiList.includes(h))return;
    const newList=[...oshiList,h];
    setOshiList(newList);
    localStorage.setItem("oshipulse_oshi",JSON.stringify(newList));
  };

  const removeOshi=(handle:string)=>{
    const newList=oshiList.filter(h=>h!==handle);
    setOshiList(newList);
    localStorage.setItem("oshipulse_oshi",JSON.stringify(newList));
  };

  const handleSubscribe=async()=>{
    if(!("serviceWorker" in navigator))return;
    try{
      const reg=await navigator.serviceWorker.ready;
      const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer});
      setSubscription(sub);setNotifyStatus("subscribed");
    }catch{setNotifyStatus("denied");}
  };

  const handleUnsubscribe=async()=>{if(subscription){await subscription.unsubscribe();setSubscription(null);setNotifyStatus("idle");}};
  const sendTestNotification=async()=>{
    if(!subscription)return;
    await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subscription,title:"OshiPulse 🎉",body:lang==="ja"?"推しの新着投稿があります！":"Your oshi just posted!",url:"/"})});
  };

  const dark=themeMode==="auto"?systemDark:themeMode==="dark";
  const cycleTheme=useCallback(()=>{setThemeMode(m=>m==="auto"?"dark":m==="dark"?"light":"auto");},[]);
  const t=I18N[lang];const d=dark;
  const bg=d?"#08090f":"#f4f3f0",surface=d?"#0f1117":"#ffffff",surfaceAlt=d?"#161820":"#f9f8f6";
  const border=d?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)",borderStrong=d?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.14)";
  const text=d?"#f0f0f0":"#111111",textMuted=d?"#6b7280":"#888888",accent="#3b82f6",neon="#00e5a0";
  const neonDim=d?"rgba(0,229,160,0.08)":"rgba(0,180,130,0.08)",neonBorder=d?"rgba(0,229,160,0.35)":"rgba(0,160,110,0.35)",neonText=d?"#00e5a0":"#007a5e";
  const themeIcon=themeMode==="auto"?"⚙️":themeMode==="dark"?"🌙":"☀️";
  const themeLabel=themeMode==="auto"?t.themeAuto:themeMode==="dark"?t.themeDark:t.themeLight;
  const toggleLike=(uri:string)=>setLikedPosts(p=>({...p,[uri]:!p[uri]}));

  return (
    <div style={{minHeight:"100vh",background:bg,fontFamily:"'DM Sans',sans-serif",transition:"background 0.3s",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=Space+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes neonPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,229,160,0)}50%{box-shadow:0 0 12px 2px rgba(0,229,160,0.25)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .post-card{animation:slideIn 0.3s ease forwards}
        .like-btn{transition:transform 0.15s;background:none;border:none;cursor:pointer}
        .like-btn:hover{transform:scale(1.15)}
        .creator-row:hover{background:${d?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"}}
        .ctrl-btn{transition:opacity 0.15s;cursor:pointer}
        .ctrl-btn:hover{opacity:0.7}
        .tab-btn{transition:all 0.2s;cursor:pointer;border:none}
        .spinner{animation:spin 0.8s linear infinite;border:2px solid ${border};border-top-color:${accent};border-radius:50%;width:20px;height:20px}
        .modal-overlay{animation:fadeIn 0.2s ease}
        .account-card:hover{background:${d?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)"}}
        input:focus{outline:none}
      `}</style>

      {/* ログインモーダル */}
      {showLogin&&(
        <div className="modal-overlay" onClick={()=>setShowLogin(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:surface,borderRadius:20,padding:28,width:"100%",maxWidth:380,border:`0.5px solid ${borderStrong}`}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:text,marginBottom:6}}><span style={{color:accent}}>Oshi</span>Pulse</div>
            <div style={{fontSize:13,color:textMuted,marginBottom:24}}>{t.loginTitle}</div>
            <input value={loginHandle} onChange={e=>setLoginHandle(e.target.value)} placeholder={t.handlePlaceholder} style={{width:"100%",background:surfaceAlt,border:`0.5px solid ${border}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:text,marginBottom:10}}/>
            <input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder={t.passwordPlaceholder} onKeyDown={e=>{if(e.key==="Enter")handleLogin();}} style={{width:"100%",background:surfaceAlt,border:`0.5px solid ${border}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:text,marginBottom:6}}/>
            <div style={{fontSize:10,color:textMuted,marginBottom:16}}>{t.loginNote}</div>
            {loginError&&<div style={{fontSize:12,color:"#ef4444",marginBottom:12}}>{loginError}</div>}
            <button onClick={handleLogin} disabled={loginLoading} style={{width:"100%",background:accent,color:"#fff",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:600,cursor:"pointer"}}>{loginLoading?"...":t.loginBtn}</button>
            <div style={{textAlign:"center",marginTop:12}}>
              <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:accent,textDecoration:"none"}}>アプリパスワードの取得方法 →</a>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div style={{background:surface,borderBottom:`0.5px solid ${border}`,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:isMobile?16:18,color:accent}}>Oshi</span>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:isMobile?16:18,color:text}}>Pulse</span>
          <span style={{fontSize:9,background:neonDim,color:neonText,border:`0.5px solid ${neonBorder}`,padding:"2px 6px",borderRadius:20,fontFamily:"'Space Mono',monospace",marginLeft:2}}>BETA</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button className="ctrl-btn" onClick={()=>setLang(l=>l==="ja"?"en":"ja")} style={{background:surfaceAlt,border:`0.5px solid ${border}`,borderRadius:20,padding:"3px 10px",fontSize:11,color:textMuted,fontFamily:"'Space Mono',monospace"}}>{lang==="ja"?"EN":"日本語"}</button>
          <div style={{position:"relative",cursor:"pointer"}}>
            <span style={{fontSize:16}}>🔔</span>
            <div style={{position:"absolute",top:-2,right:-2,width:7,height:7,background:neon,borderRadius:"50%",border:`1.5px solid ${surface}`,opacity:alertPulse?1:0.3,transition:"opacity 0.4s"}}/>
          </div>
          <button className="ctrl-btn" onClick={cycleTheme} style={{background:surfaceAlt,border:`0.5px solid ${border}`,borderRadius:20,padding:"3px 10px",fontSize:11,color:textMuted,display:"flex",alignItems:"center",gap:4}}>
            <span>{themeIcon}</span>{!isMobile&&<span>{themeLabel}</span>}
          </button>
          {user?(
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {user.avatar?(<img src={user.avatar} alt={user.handle} style={{width:28,height:28,borderRadius:"50%",objectFit:"cover"}}/>):(
                <div style={{width:28,height:28,borderRadius:"50%",background:accent+"22",border:`1.5px solid ${accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:accent}}>{getInitials(user.handle)}</div>
              )}
              {!isMobile&&<span style={{fontSize:11,color:textMuted}}>@{user.handle}</span>}
              <button className="ctrl-btn" onClick={handleLogout} style={{background:surfaceAlt,border:`0.5px solid ${border}`,borderRadius:20,padding:"3px 10px",fontSize:11,color:textMuted}}>{t.logout}</button>
            </div>
          ):(
            <button className="ctrl-btn" onClick={()=>setShowLogin(true)} style={{background:accent,color:"#fff",border:"none",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:500}}>{t.login}</button>
          )}
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"0 12px"}}>
        {notifyStatus!=="subscribed"&&(
          <div style={{margin:"12px 0",background:neonDim,border:`0.5px solid ${neonBorder}`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <span style={{fontSize:12,color:neonText}}>推しの新着投稿をリアルタイムで受け取ろう</span>
            <button onClick={handleSubscribe} style={{background:neon,color:"#000",fontSize:11,fontWeight:700,padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>{t.notifyOn}</button>
          </div>
        )}
        {notifyStatus==="subscribed"&&(
          <div style={{margin:"12px 0",background:surface,border:`0.5px solid ${neonBorder}`,borderRadius:12,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <span style={{fontSize:12,color:neonText}}>{t.notifyDone}</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={sendTestNotification} style={{background:accent,color:"#fff",fontSize:11,fontWeight:500,padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer"}}>{t.testNotify}</button>
              <button onClick={handleUnsubscribe} style={{background:surfaceAlt,color:textMuted,fontSize:11,padding:"5px 12px",borderRadius:20,border:`0.5px solid ${border}`,cursor:"pointer"}}>{t.notifyOff}</button>
            </div>
          </div>
        )}

        <div style={{padding:"8px 0 12px"}}>
          <div style={{background:surface,border:`0.5px solid ${borderStrong}`,borderRadius:12,display:"flex",alignItems:"center",gap:8,padding:"10px 14px"}}>
            <span style={{fontSize:15,color:textMuted}}>🔍</span>
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder={activeTab===2?t.searchAccount:t.search} style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:13,color:text,minWidth:0}}/>
            <button onClick={handleSearch} style={{background:accent,color:"#fff",fontSize:11,padding:"5px 14px",borderRadius:8,cursor:"pointer",fontWeight:500,border:"none",whiteSpace:"nowrap"}}>{loading?"...":t.searchBtn}</button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 280px",gap:12}}>
          <div>
            <div style={{display:"flex",gap:2,marginBottom:12,background:surfaceAlt,borderRadius:10,padding:3,border:`0.5px solid ${border}`}}>
              {t.tabs.map((label,i)=>(
                <button key={i} className="tab-btn" onClick={()=>setActiveTab(i)} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:isMobile?10:12,fontWeight:activeTab===i?500:400,background:activeTab===i?surface:"transparent",color:activeTab===i?(i===1?neonText:text):textMuted,boxShadow:activeTab===i?`0 0 0 0.5px ${border}`:"none"}}>{label}</button>
              ))}
            </div>

            {loading&&<div style={{display:"flex",justifyContent:"center",padding:"40px 0"}}><div className="spinner"/></div>}
            {!loading&&error&&<div style={{textAlign:"center",padding:"40px 0",color:textMuted,fontSize:13}}>{t.error}</div>}

            {/* アカウント検索結果 */}
            {!loading&&!error&&activeTab===2&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {accounts.length===0?(
                  <div style={{textAlign:"center",padding:"40px 0",color:textMuted,fontSize:13}}>{t.noResults}</div>
                ):accounts.map((account)=>{
                  const name=account.displayName||account.handle;
                  const color=getColor(account.handle);
                  const isAdded=oshiList.includes(account.handle);
                  return (
                    <div key={account.did} className="account-card" onClick={()=>fetchPosts(account.handle)} style={{background:surface,border:`0.5px solid ${border}`,borderRadius:14,padding:"12px 14px",cursor:"pointer",transition:"background 0.15s"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        {account.avatar?(<img src={account.avatar} alt={name} style={{width:40,height:40,borderRadius:"50%",flexShrink:0,objectFit:"cover"}}/>):(
                          <div style={{width:40,height:40,borderRadius:"50%",background:color+"22",border:`1.5px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:700,color}}>{getInitials(name)}</div>
                        )}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:500,color:text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                          <div style={{fontSize:11,color:textMuted}}>@{account.handle}</div>
                        </div>
                      </div>
                      {account.description&&<div style={{fontSize:12,color:textMuted,marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{account.description}</div>}
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={e=>{e.stopPropagation();fetchPosts(account.handle);}} style={{flex:1,background:surfaceAlt,color:text,border:`0.5px solid ${border}`,borderRadius:8,padding:"6px 0",fontSize:11,cursor:"pointer",textAlign:"center" as const}}>投稿を見る</button>
                        {user&&(
                          <button onClick={e=>{e.stopPropagation();isAdded?removeOshi(account.handle):addOshi(account.handle);}}
                            style={{flex:1,background:isAdded?surfaceAlt:neon,color:isAdded?textMuted:"#000",border:`0.5px solid ${isAdded?border:neonBorder}`,borderRadius:8,padding:"6px 0",fontSize:11,fontWeight:isAdded?400:600,cursor:"pointer",textAlign:"center" as const}}>
                            {isAdded?"✅ 追加済み":t.follow}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 投稿検索結果 */}
            {!loading&&!error&&activeTab!==2&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {posts.length===0?(
                  <div style={{textAlign:"center",padding:"40px 0",color:textMuted,fontSize:13}}>{t.noResults}</div>
                ):posts.map((post,i)=>{
                  const name=post.author.displayName||post.author.handle;
                  const color=getColor(post.author.handle);
                  const images=post.embed?.images;
                  return (
                    <div key={post.uri} className="post-card" style={{animationDelay:`${i*0.03}s`,background:surface,border:`0.5px solid ${border}`,borderRadius:14,padding:"12px 14px"}}>
                      <div style={{display:"flex",gap:10}}>
                        {post.author.avatar?(<img src={post.author.avatar} alt={name} style={{width:36,height:36,borderRadius:"50%",flexShrink:0,objectFit:"cover"}}/>):(
                          <div style={{width:36,height:36,borderRadius:"50%",background:color+"22",border:`1.5px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,color}}>{getInitials(name)}</div>
                        )}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4,gap:8}}>
                            <div style={{minWidth:0,flex:1}}>
                              <span style={{fontSize:13,fontWeight:500,color:text}}>{name}</span>
                              <span style={{fontSize:10,color:textMuted,marginLeft:6,display:"inline-block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:isMobile?"100px":"180px",verticalAlign:"middle"}}>@{post.author.handle}</span>
                            </div>
                            <span style={{fontSize:10,color:textMuted,whiteSpace:"nowrap",flexShrink:0}}>{timeAgo(post.record.createdAt,lang)}</span>
                          </div>
                          <p style={{fontSize:13,color:text,lineHeight:1.6,marginBottom:10,wordBreak:"break-word"}}>{post.record.text}</p>
                          {images&&images.length>0&&(
                            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                              {images.slice(0,2).map((img,j)=>(<img key={j} src={img.thumb} alt="" style={{width:isMobile?"100%":"48%",maxHeight:160,objectFit:"cover",borderRadius:8,border:`0.5px solid ${border}`}}/>))}
                            </div>
                          )}
                          <div style={{display:"flex",gap:16}}>
                            <button className="like-btn" onClick={()=>toggleLike(post.uri)} style={{fontSize:12,color:likedPosts[post.uri]?"#ef4444":textMuted,display:"flex",alignItems:"center",gap:4}}>
                              <span>{likedPosts[post.uri]?"❤️":"🤍"}</span><span>{likedPosts[post.uri]?post.likeCount+1:post.likeCount}</span>
                            </button>
                            <span style={{fontSize:12,color:textMuted,display:"flex",alignItems:"center",gap:4}}><span>🔁</span><span>{post.repostCount}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:isMobile?4:0}}>
            {user&&(
              <div style={{background:surface,border:`0.5px solid ${border}`,borderRadius:14,padding:"14px 16px"}}>
                <div style={{fontSize:11,fontWeight:500,color:textMuted,letterSpacing:0.8,marginBottom:12,textTransform:"uppercase"}}>{t.myOshi}</div>
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  <input value={oshiHandle} onChange={e=>setOshiHandle(e.target.value)} placeholder={t.oshiPlaceholder}
                    onKeyDown={e=>{if(e.key==="Enter"){addOshi(oshiHandle);setOshiHandle("");}}}
                    style={{flex:1,background:surfaceAlt,border:`0.5px solid ${border}`,borderRadius:8,padding:"6px 10px",fontSize:11,color:text,minWidth:0}}/>
                  <button onClick={()=>{addOshi(oshiHandle);setOshiHandle("");}} style={{background:accent,color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"}}>{t.addOshi}</button>
                </div>
                {oshiList.length>0&&(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {oshiList.map(handle=>(
                      <div key={handle} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 8px",background:surfaceAlt,borderRadius:8}}>
                        <span style={{fontSize:12,color:text,cursor:"pointer"}} onClick={()=>fetchPosts(handle)}>@{handle}</span>
                        <button onClick={()=>removeOshi(handle)} style={{background:"none",border:"none",color:textMuted,cursor:"pointer",fontSize:14,padding:"0 4px"}}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{background:surface,border:`0.5px solid ${border}`,borderRadius:14,padding:"14px 16px"}}>
              <div style={{fontSize:11,fontWeight:500,color:textMuted,letterSpacing:0.8,marginBottom:12,textTransform:"uppercase"}}>{t.radar}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {CREATORS.map(c=>(
                  <div key={c.handle} className="creator-row" onClick={()=>{setQuery(c.name);fetchPosts(c.name);}} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:8,cursor:"pointer",transition:"background 0.15s"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:c.color+"22",border:`1.5px solid ${c.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:c.color,flexShrink:0}}>{c.avatar}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,color:text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                      <div style={{height:3,background:d?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.07)",borderRadius:2,marginTop:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${c.activity}%`,background:c.activity>80?neon:c.color,borderRadius:2,transition:"width 0.8s ease"}}/>
                      </div>
                    </div>
                    <span style={{fontSize:10,color:c.activity>80?neonText:textMuted,fontFamily:"'Space Mono',monospace",flexShrink:0}}>{c.activity}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:neonDim,border:`0.5px solid ${neonBorder}`,borderRadius:14,padding:"14px 16px"}}>
              <div style={{fontSize:11,fontWeight:500,color:neonText,letterSpacing:0.8,marginBottom:10,textTransform:"uppercase",fontFamily:"'Space Mono',monospace"}}>{t.prediction}</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"#3b82f622",border:"1.5px solid #3b82f655",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#3b82f6",flexShrink:0}}>YU</div>
                <div><div style={{fontSize:12,color:text,fontWeight:500}}>Yume / 夢</div><div style={{fontSize:11,color:neonText}}>{t.predictionSub}</div></div>
              </div>
            </div>

            <div style={{background:surface,border:`0.5px solid ${border}`,borderRadius:14,padding:"14px 16px",marginBottom:isMobile?16:0}}>
              <div style={{fontSize:11,fontWeight:500,color:textMuted,letterSpacing:0.8,marginBottom:12,textTransform:"uppercase"}}>{t.mood}</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:5,height:48}}>
                {[40,55,70,60,85,90,75].map((h,i)=>(<div key={i} style={{flex:1,height:`${h}%`,background:h>80?neon:(d?"#1e3a5f":"#dbeafe"),borderRadius:3}}/>))}
              </div>
              <div style={{display:"flex",marginTop:6}}>
                {t.moodDays.map(day=>(<span key={day} style={{fontSize:10,color:textMuted,flex:1,textAlign:"center"}}>{day}</span>))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
