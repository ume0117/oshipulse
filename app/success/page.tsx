"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  useEffect(() => {
    setTimeout(() => {
      window.location.href = "/";
    }, 5000);
  }, []);

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#08090f",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:"center",padding:40}}>
        <div style={{fontSize:64,marginBottom:20}}>🎉</div>
        <h1 style={{color:"#00e5a0",fontSize:28,fontWeight:800,marginBottom:12,fontFamily:"'Syne',sans-serif"}}>
          OshiPulse Pro 開始！
        </h1>
        <p style={{color:"#6b7280",fontSize:14,marginBottom:8}}>
          ありがとうございます！
        </p>
        <p style={{color:"#6b7280",fontSize:13}}>
          5秒後にトップページに戻ります...
        </p>
        <a href="/" style={{display:"inline-block",marginTop:24,background:"#3b82f6",color:"#fff",padding:"10px 24px",borderRadius:10,textDecoration:"none",fontSize:14,fontWeight:600}}>
          今すぐ戻る
        </a>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{background:"#08090f",minHeight:"100vh"}}/>}>
      <SuccessContent />
    </Suspense>
  );
}
