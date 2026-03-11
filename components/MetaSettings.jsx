'use client'

import { useState, useRef } from "react";

// ── 팔레트: 화이트 베이스, 아이폰 감성 ─────────────────
const C = {
  bg:       "#F5F5F7",
  white:    "#FFFFFF",
  border:   "#E5E5EA",
  ink:      "#1C1C1E",
  inkMid:   "#3A3A3C",
  inkLt:    "#8E8E93",
  accent:   "#007AFF",
  accentLt: "#E8F2FF",
  good:     "#34C759",
  goodLt:   "#E8F8ED",
  warn:     "#FF9500",
  warnLt:   "#FFF4E5",
  bad:      "#FF3B30",
  badLt:    "#FFEEEE",
  sage:     "#32D74B",
  sageLt:   "#E9FAF0",
};

// ── 공통 UI ─────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    padding: "22px 20px",
    ...style
  }}>
    {children}
  </div>
);

const SectionTitle = ({ title, sub }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>{title}</div>
    {sub && <div style={{ fontSize: 12, color: C.inkLt, marginTop: 3 }}>{sub}</div>}
  </div>
);

const Label = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: C.inkLt, marginBottom: 6, letterSpacing: "0.02em" }}>
    {children}
  </div>
);

const Inp = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input
    type={type}
    value={value || ""}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: "100%",
      padding: "11px 14px",
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      fontSize: 13,
      color: C.ink,
      background: C.bg,
      outline: "none",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      boxSizing: "border-box",
      transition: "border-color 0.15s",
      ...style
    }}
    onFocus={e => e.target.style.borderColor = C.accent}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);

const Btn = ({ children, onClick, variant = "primary", small = false, disabled = false, style = {} }) => {
  const v = {
    primary: { background: C.accent, color: C.white, border: "none" },
    ghost:   { background: C.accentLt, color: C.accent, border: `1px solid ${C.accent}33` },
    danger:  { background: C.badLt, color: C.bad, border: `1px solid ${C.bad}33` },
    neutral: { background: C.bg, color: C.inkMid, border: `1px solid ${C.border}` },
    sage:    { background: C.sageLt, color: C.sage, border: `1px solid ${C.sage}44` },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...v,
      borderRadius: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      fontWeight: 600,
      fontSize: small ? 11 : 13,
      padding: small ? "6px 12px" : "10px 18px",
      transition: "opacity 0.15s",
      opacity: disabled ? 0.4 : 1,
      whiteSpace: "nowrap",
      ...style
    }}>
      {children}
    </button>
  );
};

const Divider = () => (
  <div style={{ borderTop: `1px solid ${C.border}`, margin: "20px 0" }} />
);

const InfoBadge = ({ children, color = C.accent, bg = C.accentLt }) => (
  <div style={{
    background: bg,
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 12,
    color,
    fontWeight: 500,
    marginBottom: 14
  }}>
    {children}
  </div>
);

// ── 기본 판단 기준값 ─────────────────────────────────────
const DEFAULT_CRITERIA = {
  lpv_great: 300, lpv_keep: 500, lpv_hold: 800,
  ctr_good: 2.0, ctr_normal: 1.0,
  lpvr_good: 70, lpvr_normal: 50,
  cpa_keep: 85, cpa_hold: 100,
  roas_great: 3.0, roas_keep: 2.0, roas_hold: 1.0,
  use_roas: false,
};

const LS_CRITERIA  = "oa_ad_criteria_v1";
const LS_LOGO      = "oa_logo_v1";
const LS_AD_IMAGES = "oa_ad_images_v1";

function loadAdImages() {
  try { return JSON.parse(localStorage.getItem(LS_AD_IMAGES) || "[]"); } catch { return []; }
}
function saveAdImagesToLS(imgs) {
  try { localStorage.setItem(LS_AD_IMAGES, JSON.stringify(imgs)); } catch {}
}

function loadCriteria() {
  try {
    const raw = localStorage.getItem(LS_CRITERIA);
    if (raw) return { ...DEFAULT_CRITERIA, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CRITERIA;
}
function saveCriteriaToLS(c) {
  try { localStorage.setItem(LS_CRITERIA, JSON.stringify(c)); } catch {}
}
function loadLogo() {
  try { return localStorage.getItem(LS_LOGO) || null; } catch { return null; }
}
function saveLogoToLS(dataUrl) {
  try { localStorage.setItem(LS_LOGO, dataUrl); } catch {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 광고 이미지 카드 — 인라인 이름 수정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AdImageCard({ img, onNameChange, onRemove }) {
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState(img.name);
  const [hovered,  setHovered]  = useState(false);
  const [pos,      setPos]      = useState({ x: 0, y: 0 });
  const inputRef = useRef();

  function confirm() {
    const v = draft.trim();
    if (v) onNameChange(v);
    else setDraft(img.name);
    setEditing(false);
  }

  function handleMouseMove(e) {
    setPos({ x: e.clientX, y: e.clientY });
  }

  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14,
      overflow: "hidden", display: "flex", flexDirection: "column"
    }}>
      {/* 이미지 호버 프리뷰 — 포털처럼 fixed */}
      {hovered && (
        <div style={{
          position: "fixed",
          left: pos.x + 16,
          top: pos.y - 160,
          zIndex: 9999,
          pointerEvents: "none",
          transform: "translateY(0)",
        }}>
          <img src={img.dataUrl} alt={img.name} style={{
            width: 260, height: 260, objectFit: "contain",
            borderRadius: 16, border: `1px solid ${C.border}`,
            background: C.white,
            boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
            display: "block",
          }} />
          <div style={{
            marginTop: 6, textAlign: "center", fontSize: 11, fontWeight: 600,
            color: C.white, background: "rgba(0,0,0,0.55)",
            borderRadius: 8, padding: "4px 10px", display: "inline-block",
            maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>{img.name}</div>
        </div>
      )}

      {/* 썸네일 */}
      <div
        style={{ position: "relative", aspectRatio: "1/1", background: C.border, cursor: "zoom-in" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
      >
        <img src={img.dataUrl} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <button onClick={onRemove} style={{
          position: "absolute", top: 6, right: 6,
          width: 22, height: 22, borderRadius: "50%",
          background: "rgba(0,0,0,0.45)", border: "none", cursor: "pointer",
          color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center"
        }}>✕</button>
      </div>

      {/* 이름 */}
      <div style={{ padding: "8px 10px" }}>
        {editing ? (
          <div style={{ display: "flex", gap: 4 }}>
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") confirm(); if (e.key === "Escape") { setDraft(img.name); setEditing(false); } }}
              autoFocus
              style={{
                flex: 1, minWidth: 0, padding: "5px 8px", borderRadius: 8,
                border: `1.5px solid #007AFF`, fontSize: 11, fontFamily: "inherit",
                background: "#fff", color: "#1C1C1E", outline: "none"
              }}
            />
            <button onClick={confirm} style={{
              background: "#007AFF", color: "#fff", border: "none",
              borderRadius: 8, padding: "5px 8px", fontSize: 11,
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0
            }}>✓</button>
          </div>
        ) : (
          <div
            onClick={() => { setDraft(img.name); setEditing(true); }}
            title="클릭해서 광고명 수정"
            style={{
              fontSize: 11, fontWeight: 600, color: "#1C1C1E",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              cursor: "text", padding: "4px 4px",
              borderRadius: 6, border: "1px solid transparent",
              transition: "border-color 0.15s"
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#E5E5EA"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
          >
            {img.name}
          </div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function MetaSettings({
  sheetUrl = "",
  onSheetUrlChange,
  metaStatus = "idle",
  metaRaw = [],
  // deletedAds: [{id, ad_name, deleted_at}]
  deletedAds = [],
  onDeleteAdd,         // (adName) => Promise
  onDeletedRestore,    // (id) => Promise
  onDeletedRestoreAll, // () => Promise
  margin = 30000,
  onMarginChange,
  margins = [],
  onMarginsChange,
  fetchSheet,
  criteria: criteriaProp,
  onCriteriaChange,
  // 이미지: [{id, name, url, path}]
  adImages = [],
  onAdImageUpload,     // (file, name) => Promise<{id,name,url,path}>
  onAdImageRename,     // (id, newName) => Promise
  onAdImageRemove,     // (id) => Promise
  onAdImagesRemoveAll, // () => Promise
}) {
  const [sheetInput,    setSheetInput]    = useState(sheetUrl);
  const [sheetEditing,  setSheetEditing]  = useState(false);
  const [marginInput,   setMarginInput]   = useState(String(margin));
  const [editingMargin, setEditingMargin] = useState(null);
  const [newKeyword,    setNewKeyword]    = useState("");
  const [newMarginVal,  setNewMarginVal]  = useState("");
  const [criteria,      setCriteriaState] = useState(() => criteriaProp || loadCriteria());
  const [criteriaInput, setCriteriaInput] = useState(() => criteriaProp || loadCriteria());
  const [toast,         setToast]         = useState("");
  const [logo,          setLogo]          = useState(() => loadLogo());
  const [uploading,     setUploading]     = useState(false);
  const logoRef = useRef();
  const imgRef  = useRef();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function saveCriteria() {
    setCriteriaState(criteriaInput);
    saveCriteriaToLS(criteriaInput);
    onCriteriaChange?.(criteriaInput);
    showToast("판단 기준 저장됨");
  }
  function resetCriteria() {
    setCriteriaInput(DEFAULT_CRITERIA);
    setCriteriaState(DEFAULT_CRITERIA);
    saveCriteriaToLS(DEFAULT_CRITERIA);
    onCriteriaChange?.(DEFAULT_CRITERIA);
    showToast("기본값으로 초기화됨");
  }
  const setC = (key, val) => setCriteriaInput(prev => ({ ...prev, [key]: +val || 0 }));

  function saveSheet() {
    const url = sheetInput.trim();
    onSheetUrlChange?.(url);
    setSheetEditing(false);
    if (url) fetchSheet?.(url);
    showToast("시트 URL 저장됨");
  }
  function saveMargin() {
    onMarginChange?.(+marginInput || 30000);
    showToast("기본 마진 저장됨");
  }
  function addMarginKeyword() {
    if (!newKeyword || !newMarginVal) return;
    onMarginsChange?.([...margins, { id: Date.now(), keyword: newKeyword, margin: +newMarginVal }]);
    setNewKeyword(""); setNewMarginVal("");
    showToast("키워드 추가됨");
  }
  function updateMarginKeyword(id) {
    if (!editingMargin) return;
    onMarginsChange?.(margins.map(x =>
      x.id === id ? { ...x, keyword: editingMargin.keyword, margin: +editingMargin.margin || 0 } : x
    ));
    setEditingMargin(null);
    showToast("키워드 수정됨");
  }
  function deleteMarginKeyword(id) {
    onMarginsChange?.(margins.filter(x => x.id !== id));
    showToast("키워드 삭제됨");
  }

  // 광고 이미지 업로드 — Supabase Storage
  async function handleAdImagesUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const name = file.name.replace(/\.[^.]+$/, "");
        await onAdImageUpload?.(file, name);
      }
      showToast(`이미지 ${files.length}장 업로드됨`);
    } catch (err) {
      showToast("업로드 실패 — 다시 시도해줘");
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      setLogo(dataUrl);
      saveLogoToLS(dataUrl);
      showToast("로고 업로드됨");
    };
    reader.readAsDataURL(file);
  }
  function removeLogo() {
    setLogo(null);
    try { localStorage.removeItem(LS_LOGO); } catch {}
    showToast("로고 삭제됨");
  }

  const hasSheet = metaStatus === "ok" && metaRaw.length > 0;

  const statusConfig = hasSheet
    ? { icon: "●", color: C.good, bg: C.goodLt, text: `연결됨 · ${metaRaw.length}행`, sub: deletedAds.length > 0 ? `${deletedAds.length}개 숨김` : null }
    : metaStatus === "loading"
    ? { icon: "○", color: C.warn, bg: C.warnLt, text: "불러오는 중...", sub: null }
    : metaStatus === "error"
    ? { icon: "●", color: C.bad, bg: C.badLt, text: "연결 실패", sub: "URL 또는 공유 설정 확인" }
    : { icon: "○", color: C.inkLt, bg: C.bg, text: "시트 미연결", sub: null };

  const fontBase = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 48, fontFamily: fontBase }}>

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
          background: C.ink, color: C.white, borderRadius: 100, padding: "10px 20px",
          fontSize: 13, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          whiteSpace: "nowrap", animation: "fadeIn 0.2s ease"
        }}>
          {toast}
        </div>
      )}

      {/* ── 헤더 (로고 업로드 포함) ───────────────────── */}
      <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 20px" }}>
        {/* 로고 영역 */}
        <div
          onClick={() => logoRef.current?.click()}
          style={{
            width: 48, height: 48, borderRadius: 12,
            border: `1.5px dashed ${logo ? "transparent" : C.border}`,
            background: logo ? "transparent" : C.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", overflow: "hidden", flexShrink: 0,
            transition: "border-color 0.15s",
          }}
          title="로고 업로드"
        >
          {logo
            ? <img src={logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            : <span style={{ fontSize: 20 }}>＋</span>
          }
        </div>
        <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>메타광고 설정</div>
          <div style={{ fontSize: 12, color: C.inkLt, marginTop: 2 }}>데이터 소스 · 마진 · 판단 기준</div>
        </div>

        {logo && (
          <button onClick={removeLogo} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, color: C.inkLt, padding: "4px 8px"
          }}>
            로고 삭제
          </button>
        )}
        <div style={{
          fontSize: 11, color: statusConfig.color,
          background: statusConfig.bg, borderRadius: 100,
          padding: "5px 12px", fontWeight: 600, whiteSpace: "nowrap"
        }}>
          {statusConfig.icon} {statusConfig.text}
        </div>
      </Card>

      {/* ── 1. 구글 시트 연결 ────────────────────────── */}
      <Card>
        <SectionTitle title="구글 시트" sub="메타 광고관리자 데이터 소스" />

        {hasSheet && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, fontSize: 12, color: C.inkMid, background: C.bg, padding: "9px 12px", borderRadius: 10, wordBreak: "break-all", border: `1px solid ${C.border}` }}>
              {sheetUrl}
            </div>
            <Btn variant="neutral" small onClick={() => { setSheetInput(sheetUrl); setSheetEditing(true); }}>변경</Btn>
            <Btn variant="sage" small onClick={() => fetchSheet?.(sheetUrl)}>새로고침</Btn>
          </div>
        )}

        {(!sheetUrl || sheetEditing) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <InfoBadge>
              1. 메타 광고관리자 → 보고서 → 구글 스프레드시트로 내보내기<br />
              2. 시트 공유 → "링크 있는 모든 사용자" → 뷰어<br />
              3. URL 복사 후 아래에 붙여넣기
            </InfoBadge>
            <Inp value={sheetInput} onChange={setSheetInput} placeholder="https://docs.google.com/spreadsheets/d/..." />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={saveSheet} style={{ flex: 1 }}>저장 및 연결</Btn>
              {sheetUrl && <Btn variant="neutral" onClick={() => setSheetEditing(false)}>취소</Btn>}
            </div>
          </div>
        )}

        {deletedAds.length > 0 && !sheetEditing && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.inkMid }}>숨긴 광고 ({deletedAds.length})</div>
              <Btn variant="ghost" small onClick={async () => { await onDeletedRestoreAll?.(); showToast("전체 복원됨"); }}>
                전체 복원
              </Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {deletedAds.map(d => (
                <div key={d.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`
                }}>
                  <div style={{ fontSize: 12, color: C.inkMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {d.ad_name}
                  </div>
                  <Btn variant="ghost" small onClick={async () => { await onDeletedRestore?.(d.id); showToast("복원됨"); }} style={{ marginLeft: 8, flexShrink: 0 }}>
                    복원
                  </Btn>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── 2. 마진 설정 ─────────────────────────────── */}
      <Card>
        <SectionTitle title="마진 설정" sub="광고별 CPA 판단 기준 — 키워드 미매칭 시 기본 마진 적용" />

        <Label>기본 마진</Label>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <Inp type="number" value={marginInput} onChange={setMarginInput} placeholder="30000" style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: C.inkLt }}>원</span>
          <Btn onClick={saveMargin}>저장</Btn>
        </div>

        {/* 빠른 선택 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[15000, 20000, 30000, 50000].map(v => (
            <button key={v} onClick={() => setMarginInput(String(v))} style={{
              flex: 1, padding: "9px 4px", borderRadius: 10,
              border: `1px solid ${marginInput == String(v) ? C.accent : C.border}`,
              background: marginInput == String(v) ? C.accentLt : C.bg,
              color: marginInput == String(v) ? C.accent : C.inkMid,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: fontBase, transition: "all 0.15s"
            }}>
              {v / 10000}만
            </button>
          ))}
        </div>

        <div style={{ background: C.bg, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: C.inkLt }}>현재 기본 마진</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
            ₩{margin.toLocaleString()}
          </span>
        </div>

        <Divider />
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10 }}>키워드별 마진</div>
        <InfoBadge color={C.inkMid} bg={C.bg}>
          광고명에 키워드가 포함되면 해당 마진이 자동 적용돼요
        </InfoBadge>

        {margins.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px", color: C.inkLt, fontSize: 12 }}>
            키워드별 마진 없음
          </div>
        )}

        {margins.map(m => (
          <div key={m.id} style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
            padding: "12px 14px", background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`
          }}>
            {editingMargin?.id === m.id ? (
              <>
                <Inp value={editingMargin.keyword} onChange={v => setEditingMargin(e => ({ ...e, keyword: v }))} placeholder="키워드" style={{ flex: 1 }} />
                <Inp type="number" value={editingMargin.margin} onChange={v => setEditingMargin(e => ({ ...e, margin: v }))} placeholder="마진" style={{ width: 90 }} />
                <Btn small onClick={() => updateMarginKeyword(m.id)}>저장</Btn>
                <Btn small variant="neutral" onClick={() => setEditingMargin(null)}>취소</Btn>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.ink }}>{m.keyword}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>₩{(+m.margin || 0).toLocaleString()}</span>
                <Btn small variant="neutral" onClick={() => setEditingMargin({ ...m })}>수정</Btn>
                <Btn small variant="danger" onClick={() => deleteMarginKeyword(m.id)}>삭제</Btn>
              </>
            )}
          </div>
        ))}

        {/* 새 키워드 추가 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, padding: "12px", background: C.bg, borderRadius: 12, border: `1px dashed ${C.border}` }}>
          <Inp value={newKeyword} onChange={setNewKeyword} placeholder="키워드 (예: 프리온)" style={{ flex: 1 }} />
          <Inp type="number" value={newMarginVal} onChange={setNewMarginVal} placeholder="마진" style={{ width: 90 }} />
          <span style={{ fontSize: 11, color: C.inkLt }}>원</span>
          <Btn small variant="ghost" onClick={addMarginKeyword}>추가</Btn>
        </div>
      </Card>

      {/* ── 3. 판단 기준 설정 ────────────────────────── */}
      <Card>
        <SectionTitle title="광고 판단 기준" sub="저장 후 즉시 적용" />

        <InfoBadge color={C.inkMid} bg={C.bg}>
          기준값을 변경하면 메타광고 탭의 판단이 실시간 반영돼요
        </InfoBadge>

        {/* LPV 단가 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>LPV 단가 기준</div>
          <div style={{ fontSize: 11, color: C.inkLt, marginBottom: 12 }}>랜딩페이지 1회 유입당 비용 (원)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { key: "lpv_great", label: "매우좋음 미만" },
              { key: "lpv_keep", label: "유지 미만" },
              { key: "lpv_hold", label: "보류 미만" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Inp type="number" value={criteriaInput[key]} onChange={v => setC(key, v)} style={{ textAlign: "right" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { color: C.good, bg: C.goodLt, label: "매우좋음", desc: `${criteriaInput.lpv_great}원 미만` },
              { color: C.accent, bg: C.accentLt, label: "유지", desc: `~${criteriaInput.lpv_keep - 1}원` },
              { color: C.warn, bg: C.warnLt, label: "보류", desc: `~${criteriaInput.lpv_hold - 1}원` },
              { color: C.bad, bg: C.badLt, label: "컷", desc: `${criteriaInput.lpv_hold}원+` },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: c.bg, borderRadius: 8, fontSize: 11 }}>
                <span style={{ fontWeight: 700, color: c.color }}>{c.label}</span>
                <span style={{ color: C.inkLt }}>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* CTR */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>CTR 기준</div>
          <div style={{ fontSize: 11, color: C.inkLt, marginBottom: 12 }}>클릭률 (%)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { key: "ctr_good", label: "좋음 이상" },
              { key: "ctr_normal", label: "보통 이상" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Inp type="number" value={criteriaInput[key]} onChange={v => setC(key, v)} style={{ textAlign: "right" }} />
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* LPV 전환율 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>LPV 전환율 기준</div>
          <div style={{ fontSize: 11, color: C.inkLt, marginBottom: 12 }}>클릭 → 랜딩페이지 도달 비율 (%)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { key: "lpvr_good", label: "정상 이상" },
              { key: "lpvr_normal", label: "보통 이상" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Inp type="number" value={criteriaInput[key]} onChange={v => setC(key, v)} style={{ textAlign: "right" }} />
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* 전환 캠페인 기준 선택 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>전환 캠페인 판단 기준</div>
          <div style={{ fontSize: 11, color: C.inkLt, marginBottom: 14 }}>CPA 또는 ROAS 선택</div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              { val: false, label: "CPA 기준", desc: "전환당 비용 ÷ 마진" },
              { val: true, label: "ROAS 기준", desc: "전환값 ÷ 광고비" },
            ].map(({ val, label, desc }) => (
              <button key={String(val)} onClick={() => setCriteriaInput(p => ({ ...p, use_roas: val }))} style={{
                flex: 1, padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                fontFamily: fontBase,
                border: `1.5px solid ${criteriaInput.use_roas === val ? C.accent : C.border}`,
                background: criteriaInput.use_roas === val ? C.accentLt : C.bg,
                transition: "all 0.15s", textAlign: "left"
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: criteriaInput.use_roas === val ? C.accent : C.inkMid }}>{label}</div>
                <div style={{ fontSize: 11, color: C.inkLt, marginTop: 2 }}>{desc}</div>
              </button>
            ))}
          </div>

          {!criteriaInput.use_roas && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 10 }}>CPA 기준값 (마진 대비 %)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { key: "cpa_keep", label: "유지 이하" },
                  { key: "cpa_hold", label: "보류 이하" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Inp type="number" value={criteriaInput[key]} onChange={v => setC(key, v)} style={{ textAlign: "right" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {criteriaInput.use_roas && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 10 }}>ROAS 기준값 (배수)</div>
              <InfoBadge color={C.inkMid} bg={C.bg}>
                ROAS = 전환값 ÷ 광고비 · 예) 광고비 10만원 → 전환값 30만원 = ROAS 3.0x
              </InfoBadge>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { key: "roas_great", label: "매우좋음 이상" },
                  { key: "roas_keep", label: "유지 이상" },
                  { key: "roas_hold", label: "보류 이상" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Inp type="number" value={criteriaInput[key]} onChange={v => setC(key, v)} style={{ textAlign: "right" }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={saveCriteria} style={{ flex: 1 }}>저장</Btn>
          <Btn variant="neutral" onClick={resetCriteria}>기본값</Btn>
        </div>
      </Card>

      {/* ── 4. 광고 소재 이미지 ──────────────────────── */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <SectionTitle title="광고 소재 이미지" sub="파일명 = 광고명으로 설정하면 캠페인 테이블에 자동 매칭" />
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <label style={{ cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.5 : 1 }}>
              <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleAdImagesUpload} disabled={uploading} />
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: C.accent, color: C.white, cursor: "inherit"
              }}>
                {uploading ? "업로드 중..." : "이미지 업로드"}
              </span>
            </label>
            {adImages.length > 0 && (
              <Btn variant="neutral" small onClick={async () => { await onAdImagesRemoveAll?.(); showToast("전체 삭제됨"); }}>
                전체 삭제
              </Btn>
            )}
          </div>
        </div>

        {adImages.length === 0 ? (
          <label style={{ cursor: uploading ? "not-allowed" : "pointer" }}>
            <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleAdImagesUpload} disabled={uploading} />
            <div style={{
              border: `1.5px dashed ${C.border}`, borderRadius: 14, padding: "32px 20px",
              textAlign: "center", color: C.inkLt
            }}>
              {uploading ? (
                <div style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>업로드 중...</div>
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.inkMid, marginBottom: 4 }}>클릭해서 업로드</div>
                  <div style={{ fontSize: 11 }}>파일명이 광고명으로 자동 설정돼요 · 여러 장 한번에 가능</div>
                </>
              )}
            </div>
          </label>
        ) : (
          <>
            <InfoBadge color={C.inkMid} bg={C.bg}>
              파일명을 광고명과 동일하게 수정하면 캠페인 탭에서 썸네일이 자동으로 표시돼요
            </InfoBadge>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {adImages.map(img => (
                <AdImageCard
                  key={img.id}
                  img={{ ...img, dataUrl: img.url }}
                  onNameChange={v => onAdImageRename?.(img.id, v).then(() => showToast("이름 변경됨"))}
                  onRemove={() => onAdImageRemove?.(img.id).then(() => showToast("이미지 삭제됨"))}
                />
              ))}
            </div>
          </>
        )}
      </Card>

      {/* ── 5. 시트 컬럼 가이드 ──────────────────────── */}
      <Card>
        <SectionTitle title="시트 컬럼 가이드" sub="메타 광고관리자 내보내기 컬럼 매핑" />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["필드", "매핑 컬럼명"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.inkLt, fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { field: "날짜", cols: "일 / 날짜 / 보고 시작" },
                { field: "캠페인", cols: "캠페인 이름 / campaign_name" },
                { field: "광고세트", cols: "광고 세트 이름 / adset_name" },
                { field: "광고명", cols: "광고 이름 / ad_name" },
                { field: "지출", cols: "지출 금액 (KRW) / amount_spent" },
                { field: "노출", cols: "노출 / impressions" },
                { field: "클릭", cols: "링크 클릭 / link_clicks" },
                { field: "LPV", cols: "랜딩 페이지 조회 / landing_page_views" },
                { field: "구매", cols: "공유 항목이 포함된 구매 / 결과" },
                { field: "전환값", cols: "공유 항목의 구매 전환값" },
                { field: "CTR", cols: "CTR(전체) / ctr" },
                { field: "CPC", cols: "CPC(링크 클릭당 비용) / cpc" },
              ].map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 10px", fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }}>{r.field}</td>
                  <td style={{ padding: "10px 10px", color: C.inkMid }}>{r.cols}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
