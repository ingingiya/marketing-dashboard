'use client'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MetaSettings.jsx
// 메타광고 전용 설정 페이지
// Dashboard.jsx에서 분리 — sec==="metaSettings" 일 때 렌더
//
// 사용법:
//   import MetaSettings from "./MetaSettings";
//   ...
//   {sec==="metaSettings" && (
//     <MetaSettings
//       sheetUrl={sheetUrl}
//       onSheetUrlChange={setSheetUrl}
//       metaStatus={metaStatus}
//       metaRaw={metaRaw}
//       deletedAds={deletedAds}
//       onDeletedAdsChange={setDeletedAds}
//       margin={margin}
//       onMarginChange={setMargin}
//       margins={margins}
//       onMarginsChange={setMargins}
//       fetchSheet={fetchSheet}
//     />
//   )}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState } from "react";

// ── 팔레트 (Dashboard.jsx와 동일) ──────────────────
const C = {
  rose:"#E8567A", roseLt:"#F2849E", blush:"#FCE8EE",
  cream:"#FEF8F4", gold:"#C9924A", goldLt:"#F6E8D0",
  sage:"#6BAA88", sageLt:"#E4F2EA",
  ink:"#2B1F2E", inkMid:"#6B576F", inkLt:"#B09CB5",
  white:"#FFFFFF", border:"#EDE0E8",
  good:"#4DAD7A", warn:"#E8A020", bad:"#E84B4B",
  purple:"#9B6FC7", purpleLt:"#F0E8FA",
};

// ── 공통 UI ────────────────────────────────────────
const Card = ({children, style={}}) => (
  <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 16px",...style}}>
    {children}
  </div>
);

const SectionTitle = ({icon, title, sub}) => (
  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
    <span style={{fontSize:22}}>{icon}</span>
    <div>
      <div style={{fontSize:14,fontWeight:900,color:C.ink}}>{title}</div>
      {sub && <div style={{fontSize:10,color:C.inkLt,marginTop:1}}>{sub}</div>}
    </div>
  </div>
);

const Label = ({children}) => (
  <div style={{fontSize:10,fontWeight:700,color:C.inkMid,marginBottom:5,letterSpacing:"0.05em"}}>
    {children}
  </div>
);

const Inp = ({value, onChange, placeholder, type="text", style={}}) => (
  <input
    type={type} value={value||""} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder}
    style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:9,
      fontSize:12,color:C.ink,background:C.cream,outline:"none",fontFamily:"inherit",...style}}
    onFocus={e=>e.target.style.borderColor=C.rose}
    onBlur={e=>e.target.style.borderColor=C.border}
  />
);

const Btn = ({children, onClick, variant="primary", small=false, disabled=false, style={}}) => {
  const v = {
    primary:{background:C.rose,  color:C.white,border:"none",       boxShadow:`0 3px 10px ${C.rose}44`},
    ghost:  {background:C.blush, color:C.rose, border:`1px solid ${C.rose}44`},
    sage:   {background:C.sageLt,color:C.sage, border:`1px solid ${C.sage}44`},
    danger: {background:"#FEF0F0",color:C.bad, border:`1px solid ${C.bad}33`},
    neutral:{background:C.cream, color:C.inkMid,border:`1px solid ${C.border}`},
    gold:   {background:C.goldLt,color:C.gold, border:`1px solid ${C.gold}44`},
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      style={{...v,borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",
        fontWeight:700,fontSize:small?10:12,padding:small?"5px 10px":"8px 16px",
        transition:"all 0.15s",opacity:disabled?0.5:1,...style}}>
      {children}
    </button>
  );
};

const Tag = ({color, bg, children}) => (
  <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,
    color,background:bg,border:`1px solid ${color}33`}}>
    {children}
  </span>
);

// ── 기본 판단 기준값 ────────────────────────────────
const DEFAULT_CRITERIA = {
  // LPV 단가 기준 (원)
  lpv_great:  300,   // 미만 → 매우좋음
  lpv_keep:   500,   // 미만 → 유지
  lpv_hold:   800,   // 미만 → 보류 / 이상 → 컷
  // CTR 기준 (%)
  ctr_good:   2.0,   // 이상 → 좋음
  ctr_normal: 1.0,   // 이상 → 보통 / 미만 → 소재문제
  // LPV 전환율 기준 (%)
  lpvr_good:  70,    // 이상 → 정상
  lpvr_normal:50,    // 이상 → 보통 / 미만 → 랜딩문제
  // CPA 기준 (마진 대비 비율 %)
  cpa_keep:   85,    // 이하 → 유지
  cpa_hold:   100,   // 이하 → 보류 / 초과 → 컷
  // ROAS 기준 (배수) — 전환 캠페인 전용
  roas_great: 3.0,   // 이상 → 매우좋음
  roas_keep:  2.0,   // 이상 → 유지
  roas_hold:  1.0,   // 이상 → 보류 / 미만 → 컷
  use_roas:   false, // true=ROAS 기준, false=CPA 기준
};

const LS_CRITERIA = "oa_ad_criteria_v1";

function loadCriteria() {
  try {
    const raw = localStorage.getItem(LS_CRITERIA);
    if (raw) return {...DEFAULT_CRITERIA, ...JSON.parse(raw)};
  } catch {}
  return DEFAULT_CRITERIA;
}

function saveCriteriaToLS(c) {
  try { localStorage.setItem(LS_CRITERIA, JSON.stringify(c)); } catch {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function MetaSettings({
  sheetUrl       = "",
  onSheetUrlChange,
  metaStatus     = "idle",
  metaRaw        = [],
  deletedAds     = [],
  onDeletedAdsChange,
  margin         = 30000,
  onMarginChange,
  margins        = [],
  onMarginsChange,
  fetchSheet,
  // 판단 기준 — 부모에서 관리하거나 내부 localStorage 사용
  criteria: criteriaProp,
  onCriteriaChange,
}) {
  // 시트 URL 입력
  const [sheetInput,  setSheetInput]  = useState(sheetUrl);
  const [sheetEditing, setSheetEditing] = useState(false);

  // 마진 입력
  const [marginInput,    setMarginInput]    = useState(String(margin));
  const [editingMargin,  setEditingMargin]  = useState(null);
  const [newKeyword,     setNewKeyword]     = useState("");
  const [newMarginVal,   setNewMarginVal]   = useState("");

  // 판단 기준 — prop 없으면 localStorage에서 로드
  const [criteria, setCriteriaState] = useState(()=> criteriaProp || loadCriteria());
  const [criteriaInput, setCriteriaInput] = useState(()=> criteriaProp || loadCriteria());

  function saveCriteria() {
    setCriteriaState(criteriaInput);
    saveCriteriaToLS(criteriaInput);
    onCriteriaChange?.(criteriaInput);
    showToast("✅ 판단 기준 저장됨");
  }

  function resetCriteria() {
    setCriteriaInput(DEFAULT_CRITERIA);
    setCriteriaState(DEFAULT_CRITERIA);
    saveCriteriaToLS(DEFAULT_CRITERIA);
    onCriteriaChange?.(DEFAULT_CRITERIA);
    showToast("↩ 기본값으로 초기화됨");
  }

  const setC = (key, val) => setCriteriaInput(prev => ({...prev, [key]: +val || 0}));

  // 저장 완료 토스트
  const [toast, setToast] = useState("");
  function showToast(msg) {
    setToast(msg);
    setTimeout(()=>setToast(""), 2200);
  }

  function saveSheet() {
    const url = sheetInput.trim();
    onSheetUrlChange?.(url);
    setSheetEditing(false);
    if (url) fetchSheet?.(url);
    showToast("✅ 시트 URL 저장됨");
  }

  function saveMargin() {
    onMarginChange?.(+marginInput || 30000);
    showToast("✅ 기본 마진 저장됨");
  }

  function addMarginKeyword() {
    if (!newKeyword || !newMarginVal) return;
    onMarginsChange?.([...margins, {id:Date.now(), keyword:newKeyword, margin:+newMarginVal}]);
    setNewKeyword(""); setNewMarginVal("");
    showToast("✅ 키워드 추가됨");
  }

  function updateMarginKeyword(id) {
    if (!editingMargin) return;
    onMarginsChange?.(margins.map(x =>
      x.id===id ? {...x, keyword:editingMargin.keyword, margin:+editingMargin.margin||0} : x
    ));
    setEditingMargin(null);
    showToast("✅ 키워드 수정됨");
  }

  function deleteMarginKeyword(id) {
    onMarginsChange?.(margins.filter(x => x.id !== id));
    showToast("🗑 키워드 삭제됨");
  }

  function restoreDeletedAds() {
    onDeletedAdsChange?.([]);
    try { localStorage.removeItem("oa_deleted_ads"); } catch {}
    showToast("↩ 숨긴 광고 복원됨");
  }

  const hasSheet = metaStatus === "ok" && metaRaw.length > 0;

  // ── 렌더 ────────────────────────────────────────
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20,paddingBottom:40}}>

      {/* 토스트 */}
      {toast && (
        <div style={{position:"fixed",top:20,right:20,zIndex:9999,
          background:C.ink,color:C.white,borderRadius:10,padding:"10px 18px",
          fontSize:12,fontWeight:700,boxShadow:"0 4px 20px rgba(43,31,46,0.25)",
          animation:"fadeIn 0.2s ease"}}>
          {toast}
        </div>
      )}

      {/* 페이지 헤더 */}
      <div style={{background:`linear-gradient(135deg,${C.rose},${C.roseLt})`,
        borderRadius:16,padding:"20px 22px",color:C.white,
        boxShadow:`0 8px 28px ${C.rose}44`}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",opacity:0.8,marginBottom:4}}>
          META ADS · SETTINGS
        </div>
        <div style={{fontSize:22,fontWeight:900,lineHeight:1.15}}>메타광고 설정</div>
        <div style={{fontSize:11,opacity:0.8,marginTop:6}}>
          데이터 소스 · 마진 기준 · 판단 로직 설정
        </div>
      </div>

      {/* ─── 1. 구글 시트 연결 ─────────────────── */}
      <Card>
        <SectionTitle icon="📊" title="구글 시트 연결" sub="메타 광고관리자 데이터 소스"/>

        {/* 현재 상태 뱃지 */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,
          padding:"10px 14px",borderRadius:10,
          background: hasSheet ? "#EDF7F1" : metaStatus==="error" ? "#FEF0F0" : C.goldLt,
          border:`1px solid ${hasSheet?C.good+"44":metaStatus==="error"?C.bad+"44":C.gold+"44"}`}}>
          <span style={{fontSize:16}}>
            {hasSheet?"✅":metaStatus==="loading"?"⏳":metaStatus==="error"?"❌":"🔗"}
          </span>
          <div>
            <div style={{fontSize:12,fontWeight:800,
              color:hasSheet?C.good:metaStatus==="error"?C.bad:C.gold}}>
              {hasSheet
                ? `연결됨 · ${metaRaw.length}행 로드됨${deletedAds.length>0?` (${deletedAds.length}개 숨김)`:""}`
                : metaStatus==="loading" ? "불러오는 중..."
                : metaStatus==="error"   ? "연결 실패 — URL 또는 공유 설정 확인"
                : "시트 미연결"}
            </div>
            {hasSheet && (
              <div style={{fontSize:10,color:C.inkMid,marginTop:1}}>
                데이터 갱신은 '새로고침' 버튼을 사용하세요
              </div>
            )}
          </div>
          {hasSheet && (
            <Btn variant="sage" small onClick={()=>fetchSheet?.(sheetUrl)}
              style={{marginLeft:"auto"}}>
              🔄 새로고침
            </Btn>
          )}
        </div>

        {/* URL 입력 */}
        {sheetEditing || !sheetUrl ? (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Label>구글 시트 URL</Label>
            <div style={{background:C.cream,borderRadius:8,padding:"10px 12px",
              fontSize:10,color:C.inkMid,lineHeight:1.8,marginBottom:4}}>
              <b>연결 방법</b><br/>
              1. 메타 광고관리자 → 보고서 → 구글 스프레드시트로 내보내기<br/>
              2. 시트 공유 → "링크 있는 모든 사용자" → 뷰어<br/>
              3. URL 주소창에서 전체 복사 후 아래에 붙여넣기
            </div>
            <Inp value={sheetInput} onChange={setSheetInput}
              placeholder="https://docs.google.com/spreadsheets/d/..."/>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={saveSheet} style={{flex:1}}>🔗 저장 및 연결</Btn>
              {sheetUrl && (
                <Btn variant="neutral" onClick={()=>setSheetEditing(false)}>취소</Btn>
              )}
            </div>
          </div>
        ) : (
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <div style={{flex:1,fontSize:11,color:C.inkMid,background:C.cream,
              padding:"8px 12px",borderRadius:8,wordBreak:"break-all",
              border:`1px solid ${C.border}`}}>
              {sheetUrl}
            </div>
            <div style={{display:"flex",gap:6}}>
              <Btn variant="neutral" small onClick={()=>{setSheetInput(sheetUrl);setSheetEditing(true);}}>
                ✏️ 변경
              </Btn>
              {deletedAds.length > 0 && (
                <Btn variant="ghost" small onClick={restoreDeletedAds}>
                  ↩ 숨긴 광고 복원 ({deletedAds.length})
                </Btn>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ─── 2. 마진 설정 ──────────────────────── */}
      <Card>
        <SectionTitle icon="💰" title="마진 설정"
          sub="광고별 CPA 판단 기준 — 키워드 미매칭 시 기본 마진 적용"/>

        {/* 기본 마진 */}
        <Label>기본 마진 (키워드 미매칭 시 적용)</Label>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
          <Inp type="number" value={marginInput} onChange={setMarginInput}
            placeholder="30000" style={{flex:1}}/>
          <span style={{fontSize:11,color:C.inkMid,whiteSpace:"nowrap"}}>원</span>
          <Btn onClick={saveMargin}>저장</Btn>
        </div>

        {/* 빠른 선택 버튼 */}
        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {[15000, 20000, 30000, 50000].map(v => (
            <button key={v} onClick={()=>setMarginInput(String(v))}
              style={{flex:1,padding:"7px 4px",borderRadius:8,
                border:`1px solid ${C.border}`,
                background:marginInput==String(v)?C.rose:C.cream,
                color:marginInput==String(v)?C.white:C.inkMid,
                fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                transition:"all 0.15s"}}>
              ₩{v/1000}만
            </button>
          ))}
        </div>

        {/* 현재 설정값 */}
        <div style={{background:C.blush,borderRadius:10,padding:"10px 14px",
          marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:11,color:C.inkMid}}>현재 기본 마진</div>
          <div style={{fontSize:18,fontWeight:900,color:C.rose}}>
            ₩{margin.toLocaleString()}
          </div>
        </div>

        {/* 키워드별 마진 목록 */}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16}}>
          <div style={{fontSize:12,fontWeight:800,color:C.ink,marginBottom:12}}>
            키워드별 마진
          </div>
          <div style={{background:C.goldLt,borderRadius:8,padding:"8px 12px",
            fontSize:10,color:C.gold,fontWeight:700,marginBottom:12}}>
            💡 광고명에 키워드가 포함되면 해당 마진이 자동 적용돼요
          </div>

          {margins.length === 0 && (
            <div style={{textAlign:"center",padding:"20px",color:C.inkLt,fontSize:11}}>
              키워드별 마진이 없습니다<br/>아래에서 추가해보세요
            </div>
          )}

          {margins.map(m => (
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
              padding:"10px 12px",background:C.cream,borderRadius:10,border:`1px solid ${C.border}`}}>
              {editingMargin?.id === m.id ? (
                <>
                  <Inp value={editingMargin.keyword}
                    onChange={v=>setEditingMargin(e=>({...e,keyword:v}))}
                    placeholder="키워드" style={{flex:1}}/>
                  <Inp type="number" value={editingMargin.margin}
                    onChange={v=>setEditingMargin(e=>({...e,margin:v}))}
                    placeholder="마진" style={{width:90}}/>
                  <span style={{fontSize:10,color:C.inkMid}}>원</span>
                  <Btn small onClick={()=>updateMarginKeyword(m.id)}>✓</Btn>
                  <Btn small variant="neutral" onClick={()=>setEditingMargin(null)}>✕</Btn>
                </>
              ) : (
                <>
                  <div style={{flex:1}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.ink,
                      background:C.blush,padding:"2px 10px",borderRadius:20,
                      border:`1px solid ${C.rose}33`}}>
                      {m.keyword}
                    </span>
                  </div>
                  <span style={{fontSize:14,fontWeight:900,color:C.rose}}>
                    ₩{(+m.margin||0).toLocaleString()}
                  </span>
                  <span style={{fontSize:10,color:C.inkLt}}>원</span>
                  <Btn small variant="neutral" onClick={()=>setEditingMargin({...m})}>✏️</Btn>
                  <Btn small variant="danger" onClick={()=>deleteMarginKeyword(m.id)}>🗑</Btn>
                </>
              )}
            </div>
          ))}

          {/* 새 키워드 추가 */}
          <div style={{display:"flex",gap:8,alignItems:"center",marginTop:12,
            padding:"12px",background:C.sageLt,borderRadius:10,
            border:`1px dashed ${C.sage}66`}}>
            <Inp value={newKeyword} onChange={setNewKeyword}
              placeholder="키워드 (예: 프리온)" style={{flex:1}}/>
            <Inp type="number" value={newMarginVal} onChange={setNewMarginVal}
              placeholder="마진" style={{width:90}}/>
            <span style={{fontSize:10,color:C.inkMid,whiteSpace:"nowrap"}}>원</span>
            <Btn small variant="sage" onClick={addMarginKeyword}>+ 추가</Btn>
          </div>
        </div>
      </Card>

      {/* ─── 3. 판단 기준 설정 ─────────────────── */}
      <Card>
        <SectionTitle icon="⚙️" title="광고 판단 기준" sub="수치를 직접 설정하세요 — 저장 후 즉시 적용"/>

        <div style={{background:C.goldLt,borderRadius:8,padding:"9px 12px",
          fontSize:10,color:C.gold,fontWeight:700,marginBottom:18}}>
          💡 기준값을 변경하면 메타광고 탭의 🟢🟡🔴 판단이 실시간 반영돼요
        </div>

        {/* LPV 단가 */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:800,color:C.ink,marginBottom:3}}>LPV 단가 기준 (원)</div>
          <div style={{fontSize:10,color:C.inkLt,marginBottom:10}}>랜딩페이지 1회 유입당 비용</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[
              {key:"lpv_great", label:"🟢 매우좋음 미만", unit:"원"},
              {key:"lpv_keep",  label:"🔵 유지 미만",     unit:"원"},
              {key:"lpv_hold",  label:"🟡 보류 미만",     unit:"원"},
            ].map(({key,label,unit})=>(
              <div key={key}>
                <Label>{label}</Label>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <Inp type="number" value={criteriaInput[key]}
                    onChange={v=>setC(key,v)} style={{textAlign:"right"}}/>
                  <span style={{fontSize:10,color:C.inkMid,whiteSpace:"nowrap"}}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
          {/* 미리보기 */}
          <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
            {[
              {color:C.good, bg:"#EDF7F1", icon:"🟢", label:"매우좋음", desc:`${criteriaInput.lpv_great}원 미만`},
              {color:C.sage, bg:C.sageLt,  icon:"🔵", label:"유지",     desc:`${criteriaInput.lpv_great}~${criteriaInput.lpv_keep-1}원`},
              {color:C.warn, bg:"#FFF8EC", icon:"🟡", label:"보류",     desc:`${criteriaInput.lpv_keep}~${criteriaInput.lpv_hold-1}원`},
              {color:C.bad,  bg:"#FEF0F0", icon:"🔴", label:"컷",       desc:`${criteriaInput.lpv_hold}원 이상`},
            ].map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                padding:"6px 10px",background:c.bg,borderRadius:8,
                border:`1px solid ${c.color}33`,fontSize:10}}>
                <span>{c.icon}</span>
                <span style={{fontWeight:700,color:c.color}}>{c.label}</span>
                <span style={{color:C.inkMid}}>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,marginBottom:20}}/>

        {/* CTR */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:800,color:C.ink,marginBottom:3}}>CTR 기준 (%)</div>
          <div style={{fontSize:10,color:C.inkLt,marginBottom:10}}>클릭률</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              {key:"ctr_good",   label:"🟢 좋음 이상",  unit:"%"},
              {key:"ctr_normal", label:"🟡 보통 이상",  unit:"%"},
            ].map(({key,label,unit})=>(
              <div key={key}>
                <Label>{label}</Label>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <Inp type="number" value={criteriaInput[key]}
                    onChange={v=>setC(key,v)} style={{textAlign:"right"}}/>
                  <span style={{fontSize:10,color:C.inkMid}}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
            {[
              {color:C.good,bg:"#EDF7F1",icon:"🟢",label:"좋음",    desc:`${criteriaInput.ctr_good}% 이상`},
              {color:C.warn,bg:"#FFF8EC",icon:"🟡",label:"보통",    desc:`${criteriaInput.ctr_normal}~${criteriaInput.ctr_good}%`},
              {color:C.bad, bg:"#FEF0F0",icon:"🔴",label:"소재문제",desc:`${criteriaInput.ctr_normal}% 미만`},
            ].map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                padding:"6px 10px",background:c.bg,borderRadius:8,
                border:`1px solid ${c.color}33`,fontSize:10}}>
                <span>{c.icon}</span>
                <span style={{fontWeight:700,color:c.color}}>{c.label}</span>
                <span style={{color:C.inkMid}}>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,marginBottom:20}}/>

        {/* LPV 전환율 */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:800,color:C.ink,marginBottom:3}}>LPV 전환율 기준 (%)</div>
          <div style={{fontSize:10,color:C.inkLt,marginBottom:10}}>클릭 → 랜딩페이지 도달 비율</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              {key:"lpvr_good",   label:"✅ 정상 이상",  unit:"%"},
              {key:"lpvr_normal", label:"⚠️ 보통 이상", unit:"%"},
            ].map(({key,label,unit})=>(
              <div key={key}>
                <Label>{label}</Label>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <Inp type="number" value={criteriaInput[key]}
                    onChange={v=>setC(key,v)} style={{textAlign:"right"}}/>
                  <span style={{fontSize:10,color:C.inkMid}}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
            {[
              {color:C.good,bg:"#EDF7F1",icon:"✅",label:"정상",     desc:`${criteriaInput.lpvr_good}% 이상`},
              {color:C.warn,bg:"#FFF8EC",icon:"⚠️",label:"보통",    desc:`${criteriaInput.lpvr_normal}~${criteriaInput.lpvr_good}%`},
              {color:C.bad, bg:"#FEF0F0",icon:"🚨",label:"랜딩문제",desc:`${criteriaInput.lpvr_normal}% 미만`},
            ].map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                padding:"6px 10px",background:c.bg,borderRadius:8,
                border:`1px solid ${c.color}33`,fontSize:10}}>
                <span>{c.icon}</span>
                <span style={{fontWeight:700,color:c.color}}>{c.label}</span>
                <span style={{color:C.inkMid}}>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,marginBottom:20}}/>

        {/* 전환 캠페인 판단 기준 선택 */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:800,color:C.ink,marginBottom:3}}>전환 캠페인 판단 기준</div>
          <div style={{fontSize:10,color:C.inkLt,marginBottom:12}}>CPA 또는 ROAS 중 어느 기준으로 판단할지 선택하세요</div>

          {/* 토글 */}
          <div style={{display:"flex",gap:6,marginBottom:16}}>
            {[
              {val:false, label:"📉 CPA 기준", desc:"전환당 비용 ÷ 마진"},
              {val:true,  label:"📈 ROAS 기준", desc:"전환값 ÷ 광고비"},
            ].map(({val,label,desc})=>(
              <button key={String(val)}
                onClick={()=>setCriteriaInput(p=>({...p,use_roas:val}))}
                style={{flex:1,padding:"10px 12px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",
                  border:`1.5px solid ${criteriaInput.use_roas===val?C.rose:C.border}`,
                  background:criteriaInput.use_roas===val?C.blush:C.cream,
                  transition:"all 0.15s"}}>
                <div style={{fontSize:12,fontWeight:800,
                  color:criteriaInput.use_roas===val?C.rose:C.inkMid}}>{label}</div>
                <div style={{fontSize:10,color:C.inkLt,marginTop:2}}>{desc}</div>
              </button>
            ))}
          </div>

          {/* CPA 기준 섹션 */}
          {!criteriaInput.use_roas && (
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.inkMid,marginBottom:10}}>CPA 기준값 (마진 대비 %)</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  {key:"cpa_keep", label:"✅ 유지 이하",  unit:"%"},
                  {key:"cpa_hold", label:"⚠️ 보류 이하", unit:"%"},
                ].map(({key,label,unit})=>(
                  <div key={key}>
                    <Label>{label}</Label>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <Inp type="number" value={criteriaInput[key]}
                        onChange={v=>setC(key,v)} style={{textAlign:"right"}}/>
                      <span style={{fontSize:10,color:C.inkMid}}>{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
                {[
                  {color:C.good,bg:"#EDF7F1",icon:"✅",label:"유지", desc:`마진의 ${criteriaInput.cpa_keep}% 이하`},
                  {color:C.warn,bg:"#FFF8EC",icon:"⚠️",label:"보류",desc:`마진의 ${criteriaInput.cpa_keep}~${criteriaInput.cpa_hold}%`},
                  {color:C.bad, bg:"#FEF0F0",icon:"🔴",label:"컷",  desc:`마진의 ${criteriaInput.cpa_hold}% 초과`},
                ].map((c,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                    padding:"6px 10px",background:c.bg,borderRadius:8,
                    border:`1px solid ${c.color}33`,fontSize:10}}>
                    <span>{c.icon}</span>
                    <span style={{fontWeight:700,color:c.color}}>{c.label}</span>
                    <span style={{color:C.inkMid}}>{c.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROAS 기준 섹션 */}
          {criteriaInput.use_roas && (
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.inkMid,marginBottom:10}}>ROAS 기준값 (배수)</div>
              <div style={{background:C.sageLt,borderRadius:8,padding:"8px 12px",
                fontSize:10,color:C.sage,fontWeight:700,marginBottom:12}}>
                💡 ROAS = 전환값 ÷ 광고비 · 예) 광고비 10만원 → 전환값 30만원 = ROAS 3.0x
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[
                  {key:"roas_great", label:"🟢 매우좋음 이상", unit:"x"},
                  {key:"roas_keep",  label:"🔵 유지 이상",     unit:"x"},
                  {key:"roas_hold",  label:"🟡 보류 이상",     unit:"x"},
                ].map(({key,label,unit})=>(
                  <div key={key}>
                    <Label>{label}</Label>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <Inp type="number" value={criteriaInput[key]}
                        onChange={v=>setC(key,v)} style={{textAlign:"right"}}/>
                      <span style={{fontSize:10,color:C.inkMid}}>{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
                {[
                  {color:C.good,bg:"#EDF7F1",icon:"🟢",label:"매우좋음",desc:`ROAS ${criteriaInput.roas_great}x 이상`},
                  {color:C.sage,bg:C.sageLt, icon:"🔵",label:"유지",    desc:`ROAS ${criteriaInput.roas_keep}~${criteriaInput.roas_great}x`},
                  {color:C.warn,bg:"#FFF8EC",icon:"🟡",label:"보류",    desc:`ROAS ${criteriaInput.roas_hold}~${criteriaInput.roas_keep}x`},
                  {color:C.bad, bg:"#FEF0F0",icon:"🔴",label:"컷",      desc:`ROAS ${criteriaInput.roas_hold}x 미만`},
                ].map((c,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                    padding:"6px 10px",background:c.bg,borderRadius:8,
                    border:`1px solid ${c.color}33`,fontSize:10}}>
                    <span>{c.icon}</span>
                    <span style={{fontWeight:700,color:c.color}}>{c.label}</span>
                    <span style={{color:C.inkMid}}>{c.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 저장/초기화 버튼 */}
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <Btn onClick={saveCriteria} style={{flex:1}}>💾 판단 기준 저장</Btn>
          <Btn variant="neutral" onClick={resetCriteria}>↩ 기본값</Btn>
        </div>
      </Card>

      {/* ─── 4. 시트 컬럼 가이드 ────────────────── */}
      <Card>
        <SectionTitle icon="📋" title="시트 컬럼 가이드"
          sub="메타 광고관리자 내보내기 컬럼 매핑"/>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.border}`}}>
                {["대시보드 필드","매핑 컬럼명 (우선순위 순)"].map(h => (
                  <th key={h} style={{padding:"8px 10px",textAlign:"left",
                    color:C.inkLt,fontWeight:700,fontSize:9,letterSpacing:"0.05em",
                    whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {field:"날짜",    cols:"일 / 날짜 / 보고 시작"},
                {field:"캠페인",  cols:"캠페인 이름 / campaign_name"},
                {field:"광고세트",cols:"광고 세트 이름 / adset_name"},
                {field:"광고명",  cols:"광고 이름 / ad_name"},
                {field:"목표",    cols:"목표 / 목적 / objective"},
                {field:"지출",    cols:"지출 금액 (KRW) / amount_spent"},
                {field:"노출",    cols:"노출 / impressions"},
                {field:"클릭",    cols:"링크 클릭 / link_clicks"},
                {field:"LPV",     cols:"랜딩 페이지 조회 / landing_page_views"},
                {field:"구매",    cols:"공유 항목이 포함된 구매 / 결과"},
                {field:"전환값",  cols:"공유 항목의 구매 전환값"},
                {field:"CTR",     cols:"CTR(전체) / ctr"},
                {field:"CPC",     cols:"CPC(링크 클릭당 비용) / cpc"},
              ].map((r,i) => (
                <tr key={i} style={{borderBottom:`1px solid ${C.border}`,
                  background:i%2===0?C.white:C.cream}}>
                  <td style={{padding:"9px 10px",fontWeight:700,color:C.ink,whiteSpace:"nowrap"}}>
                    {r.field}
                  </td>
                  <td style={{padding:"9px 10px",color:C.inkMid,fontSize:10}}>
                    {r.cols}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
