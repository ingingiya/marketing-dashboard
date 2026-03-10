'use client'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CreativeModal.jsx
// 광고 소재 이미지 뷰어 + 업로드
// 저장: IndexedDB (새로고침해도 유지)
//
// 사용법 (Dashboard.jsx):
//   import CreativeModal, { useCreatives } from "./CreativeModal";
//
//   const { creatives, addCreatives, removeCreative } = useCreatives();
//   const [creativeAd, setCreativeAd] = useState(null);
//
//   // 캠페인 테이블 tr
//   <tr onClick={()=>setCreativeAd(c)} style={{cursor:"pointer",...}}>
//
//   // 렌더 맨 아래
//   {creativeAd && (
//     <CreativeModal
//       ad={creativeAd}
//       onClose={()=>setCreativeAd(null)}
//       campTab={campTab}
//       margin={margin}
//       creatives={creatives}
//       onUpload={addCreatives}
//       onRemove={removeCreative}
//     />
//   )}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useEffect, useCallback, useRef } from "react";

const C = {
  rose:"#E8567A", roseLt:"#F2849E", blush:"#FCE8EE",
  cream:"#FEF8F4", gold:"#C9924A", goldLt:"#F6E8D0",
  sage:"#6BAA88", sageLt:"#E4F2EA",
  ink:"#2B1F2E", inkMid:"#6B576F", inkLt:"#B09CB5",
  white:"#FFFFFF", border:"#EDE0E8",
  good:"#4DAD7A", warn:"#E8A020", bad:"#E84B4B",
};

const fmtW = n =>
  n >= 1000 ? `₩${Math.round(n / 1000).toLocaleString()}K` : `₩${Math.round(n).toLocaleString()}`;

function normalize(name) {
  return (name || "").toLowerCase().trim().replace(/\s+/g, " ");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IndexedDB 헬퍼
// DB: "oa_creatives" / Store: "creatives" / key: 정규화된 광고명
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DB_NAME  = "oa_creatives";
const DB_VER   = 1;
const ST_NAME  = "creatives";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(ST_NAME);
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function idbGetAll() {
  const db    = await openDB();
  const tx    = db.transaction(ST_NAME, "readonly");
  const store = tx.objectStore(ST_NAME);
  return new Promise((resolve, reject) => {
    const result = {};
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) { result[cursor.key] = cursor.value; cursor.continue(); }
      else resolve(result);
    };
    tx.onerror = e => reject(e.target.error);
  });
}

async function idbPut(key, value) {
  const db    = await openDB();
  const tx    = db.transaction(ST_NAME, "readwrite");
  tx.objectStore(ST_NAME).put(value, key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

async function idbDelete(key) {
  const db    = await openDB();
  const tx    = db.transaction(ST_NAME, "readwrite");
  tx.objectStore(ST_NAME).delete(key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 훅: IndexedDB 기반 소재 관리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function useCreatives() {
  // { [정규화된광고명]: { dataUrl, fileName, type } }
  const [creatives, setCreatives] = useState({});
  const [dbReady,   setDbReady]   = useState(false);

  // 마운트 시 IndexedDB 전체 로드
  useEffect(() => {
    idbGetAll()
      .then(all => { setCreatives(all); setDbReady(true); })
      .catch(() => setDbReady(true)); // 실패해도 빈 상태로 진행
  }, []);

  // 파일 여러 개 업로드 → IndexedDB 저장 + state 업데이트
  const addCreatives = useCallback((files) => {
    const readers = Array.from(files).map(file =>
      new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const key      = normalize(baseName);
          const value    = { dataUrl: e.target.result, fileName: file.name, type: file.type };
          resolve({ key, value });
        };
        reader.readAsDataURL(file);
      })
    );

    Promise.all(readers).then(async results => {
      // IndexedDB에 저장
      await Promise.all(results.map(({ key, value }) => idbPut(key, value)));
      // state 업데이트
      setCreatives(prev => {
        const next = { ...prev };
        results.forEach(({ key, value }) => { next[key] = value; });
        return next;
      });
    }).catch(console.error);
  }, []);

  // 삭제
  const removeCreative = useCallback(async (adName) => {
    const key = normalize(adName);
    await idbDelete(key).catch(console.error);
    setCreatives(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  return { creatives, addCreatives, removeCreative, dbReady };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 소재 모달
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function CreativeModal({
  ad,
  onClose,
  campTab,
  margin    = 30000,
  creatives = {},
  onUpload,
  onRemove,
}) {
  const fileInputRef      = useRef();
  const [dragOver, setDragOver] = useState(false);
  // 업로드 직후 즉시 미리보기를 위한 로컬 objectURL
  const [previewUrl, setPreviewUrl] = useState(null);

  if (!ad) return null;

  const key      = normalize(ad.name);
  const creative = creatives[key] || null;
  const isConv   = campTab === "conversion";
  const isVideo  = (type) => type && type.startsWith("video/");

  // 표시할 src: 방금 올린 파일이면 previewUrl, 아니면 저장된 dataUrl
  const displaySrc = previewUrl || creative?.dataUrl || null;
  const displayType = previewUrl
    ? (fileInputRef.current?.files?.[0]?.type || "image/jpeg")
    : creative?.type || "";

  // 지표 계산
  const cpa     = ad.purchases > 0 ? Math.round(ad.spend / ad.purchases) : 0;
  const roas    = ad.convValue > 0 && ad.spend > 0 ? (ad.convValue / ad.spend).toFixed(2) : 0;
  const lpvCost = ad.lpv > 0 ? Math.round(ad.spend / ad.lpv) : 0;
  const lpvRate = ad.clicks > 0 ? Math.round((ad.lpv / ad.clicks) * 100) : 0;
  const ctr     = ad.ctr || 0;
  const cpc     = ad.cpc || 0;

  const lpvColor  = lpvCost > 0 ? (lpvCost < 300 ? C.good : lpvCost < 500 ? C.sage : lpvCost < 800 ? C.warn : C.bad) : C.inkLt;
  const cpaColor  = cpa > 0 ? (cpa <= margin * 0.85 ? C.good : cpa <= margin ? C.warn : C.bad) : C.inkLt;
  const roasColor = +roas >= 3 ? C.good : +roas >= 1.5 ? C.warn : C.bad;
  const ctrColor  = ctr >= 2 ? C.good : ctr >= 1 ? C.warn : C.bad;
  const lpvRColor = lpvRate >= 70 ? C.good : lpvRate >= 50 ? C.warn : C.bad;

  const kpis = isConv ? [
    { label:"광고비",    value: fmtW(ad.spend),                     color: C.inkMid  },
    { label:"구매",      value: `${ad.purchases}건`,                color: C.good    },
    { label:"CPA",       value: cpa  > 0 ? fmtW(cpa)  : "—",       color: cpaColor  },
    { label:"ROAS",      value: +roas > 0 ? `${roas}x` : "—",      color: roasColor },
    { label:"LPV단가",   value: lpvCost > 0 ? fmtW(lpvCost) : "—", color: lpvColor  },
    { label:"LPV전환율", value: `${lpvRate}%`,                      color: lpvRColor },
    { label:"CTR",       value: `${ctr}%`,                          color: ctrColor  },
    { label:"클릭",      value: ad.clicks.toLocaleString(),         color: C.inkMid  },
  ] : [
    { label:"광고비",    value: fmtW(ad.spend),                     color: C.inkMid },
    { label:"클릭",      value: ad.clicks.toLocaleString(),         color: C.inkMid },
    { label:"LPV",       value: ad.lpv.toLocaleString(),            color: C.sage   },
    { label:"CPC",       value: cpc > 0 ? fmtW(cpc) : "—",         color: cpc <= 130 ? C.good : C.bad },
    { label:"CTR",       value: `${ctr}%`,                          color: ctrColor },
    { label:"LPV단가",   value: lpvCost > 0 ? fmtW(lpvCost) : "—", color: lpvColor },
    { label:"LPV전환율", value: `${lpvRate}%`,                      color: lpvRColor },
  ];

  function handleFiles(files) {
    if (!files || files.length === 0) return;
    // 즉시 미리보기: 첫 번째 파일을 objectURL로 표시
    const first = files[0];
    const url   = URL.createObjectURL(first);
    setPreviewUrl(url);
    // IndexedDB 저장 + state 업데이트
    onUpload?.(files);
  }

  function handleDelete() {
    setPreviewUrl(null);
    onRemove?.(ad.name);
  }

  // ── 렌더 ──────────────────────────────────────
  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, zIndex:999,
        background:"rgba(43,31,46,0.55)", backdropFilter:"blur(6px)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:C.white, borderRadius:20, width:"100%", maxWidth:660,
          maxHeight:"92vh", overflowY:"auto",
          boxShadow:"0 24px 60px rgba(43,31,46,0.25)",
        }}
      >
        {/* 헤더 */}
        <div style={{
          padding:"18px 20px 14px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"flex-start", gap:12,
        }}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:5}}>
              <span style={{
                fontSize:10, fontWeight:800, padding:"2px 9px", borderRadius:20,
                background: isConv ? C.blush : C.sageLt,
                color:      isConv ? C.rose  : C.sage,
                border:`1px solid ${isConv ? C.rose : C.sage}44`,
              }}>
                {isConv ? "🛒 전환" : "🚀 트래픽"}
              </span>
              {ad.adset && (
                <span style={{
                  fontSize:10, color:C.inkLt, maxWidth:200,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>
                  {ad.adset}
                </span>
              )}
            </div>
            <div style={{fontSize:14, fontWeight:900, color:C.ink, wordBreak:"break-all", lineHeight:1.4}}>
              {ad.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              flexShrink:0, background:"none", border:`1px solid ${C.border}`,
              borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:15,
              color:C.inkLt, display:"flex", alignItems:"center", justifyContent:"center",
            }}
          >✕</button>
        </div>

        {/* 소재 영역 */}
        <div style={{padding:"16px 20px 0"}}>
          {displaySrc ? (
            /* ── 소재 있음 ── */
            <div style={{position:"relative"}}>
              {isVideo(displayType) ? (
                <video
                  key={displaySrc}
                  src={displaySrc}
                  controls autoPlay muted loop
                  style={{
                    width:"100%", maxHeight:400, borderRadius:14,
                    objectFit:"contain", background:"#000", display:"block",
                  }}
                />
              ) : (
                <img
                  key={displaySrc}
                  src={displaySrc}
                  alt={ad.name}
                  style={{
                    width:"100%", maxHeight:400, borderRadius:14,
                    objectFit:"contain", background:C.cream, display:"block",
                  }}
                  onError={e => { e.target.style.display = "none"; }}
                />
              )}
              {/* 변경 / 삭제 오버레이 */}
              <div style={{position:"absolute", top:10, right:10, display:"flex", gap:6}}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background:"rgba(43,31,46,0.72)", color:C.white, border:"none",
                    borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer",
                  }}
                >🔄 변경</button>
                <button
                  onClick={handleDelete}
                  style={{
                    background:"rgba(232,75,75,0.88)", color:C.white, border:"none",
                    borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer",
                  }}
                >🗑 삭제</button>
              </div>
              {/* 파일명 */}
              {creative?.fileName && (
                <div style={{
                  marginTop:8, padding:"4px 10px", background:C.sageLt,
                  borderRadius:8, fontSize:9, color:C.sage, fontWeight:700, display:"inline-block",
                }}>
                  📁 {creative.fileName}
                </div>
              )}
            </div>
          ) : (
            /* ── 소재 없음 — 업로드 영역 ── */
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                height:240, borderRadius:14, cursor:"pointer",
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:10,
                transition:"all 0.18s",
                background: dragOver ? C.blush : C.cream,
                border:`2px dashed ${dragOver ? C.rose : C.border}`,
              }}
            >
              <span style={{fontSize:44}}>{dragOver ? "📥" : "🖼️"}</span>
              <div style={{fontSize:13, fontWeight:800, color: dragOver ? C.rose : C.inkMid}}>
                {dragOver ? "여기에 놓기" : "소재 없음 — 업로드해주세요"}
              </div>
              <div style={{
                fontSize:10, color:C.inkLt, textAlign:"center", lineHeight:1.8, maxWidth:280,
              }}>
                클릭하거나 파일을 드래그하세요<br/>
                <span style={{color:C.rose, fontWeight:700}}>파일명 = 광고명</span>으로 저장하면 자동 매칭<br/>
                여러 파일 한꺼번에 올리면 광고별로 자동 분류<br/>
                <span style={{fontSize:9, color:C.inkLt}}>JPG · PNG · WEBP · GIF · MP4 · 새로고침 후에도 유지</span>
              </div>
            </div>
          )}
        </div>

        {/* 성과 지표 */}
        <div style={{padding:"14px 20px 20px"}}>
          <div style={{
            fontSize:10, fontWeight:800, color:C.inkLt, marginBottom:8,
            textTransform:"uppercase", letterSpacing:"0.1em",
          }}>
            성과 지표
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7}}>
            {kpis.map((k, i) => (
              <div key={i} style={{
                background:C.cream, border:`1px solid ${C.border}`,
                borderRadius:10, padding:"9px 10px", textAlign:"center",
              }}>
                <div style={{fontSize:8, color:C.inkLt, fontWeight:700, letterSpacing:"0.08em", marginBottom:3}}>
                  {k.label}
                </div>
                <div style={{fontSize:14, fontWeight:900, color:k.color}}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 숨겨진 파일 input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/quicktime"
          multiple
          style={{display:"none"}}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
