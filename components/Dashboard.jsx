'use client'

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import MetaSettings from "./MetaSettings";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 팔레트 — 아이폰/토스 감성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  blue:     "#5AC8FA",
  blueLt:   "#EAF7FD",
  purple:   "#AF52DE",
  purpleLt: "#F5EAFD",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', 'Helvetica Neue', sans-serif";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 기본값
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DEFAULT_MARGINS = [
  { id: 1, keyword: "프리온",    margin: 20000 },
  { id: 2, keyword: "소닉플로우", margin: 35000 },
];
const DEFAULT_CRITERIA = {
  lpv_great: 300, lpv_keep: 500, lpv_hold: 800,
  ctr_good: 2.0, ctr_normal: 1.0,
  lpvr_good: 70, lpvr_normal: 50,
  cpa_keep: 85, cpa_hold: 100,
  roas_great: 3.0, roas_keep: 2.0, roas_hold: 1.0, use_roas: false,
};

const LS_SHEET_URL = "oa_sheet_url";
const LS_MARGIN    = "oa_margin_v7";
const LS_MARGINS   = "oa_margins_v7";
const LS_CRITERIA  = "oa_ad_criteria_v1";
const LS_LOGO      = "oa_logo_v1";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 유틸
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function useLocal(key, def) {
  const [data, setData] = useState(def);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let stored = def;
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) stored = JSON.parse(raw);
    } catch {}
    setData(stored);
    setLoaded(true);
  }, []);
  const save = useCallback((v) => {
    setData(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key]);
  return [data, save, loaded];
}

function parseCSV(text) {
  const lines = text.trim().split("\n").map(l => {
    const res = []; let cur = "", inQ = false;
    for (let i = 0; i < l.length; i++) {
      if (l[i] === '"') { inQ = !inQ; }
      else if (l[i] === "," && !inQ) { res.push(cur.trim()); cur = ""; }
      else cur += l[i];
    }
    res.push(cur.trim());
    return res;
  });
  if (lines.length < 2) return [];
  const HINTS = ["캠페인", "campaign", "날짜", "date", "일", "광고", "지출", "노출", "impressions", "spend"];
  const firstRowStr = lines[0].join(",").toLowerCase();
  const startIdx = HINTS.some(h => firstRowStr.includes(h)) ? 0 : 1;
  const headers = lines[startIdx].map(h => h.trim());
  return lines.slice(startIdx + 1).filter(l => l.some(c => c)).map(row => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i] || ""; });
    return obj;
  });
}

function mapMetaRow(row) {
  const g = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    }
    return "";
  };
  const num = v => {
    if (!v) return 0;
    const n = parseFloat(String(v).replace(/,/g, "").replace(/[^0-9.-]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  return {
    date:        g("일", "날짜", "보고 시작", "date"),
    campaign:    g("캠페인 이름", "campaign_name", "campaign"),
    adset:       g("광고 세트 이름", "adset_name"),
    adName:      g("광고 이름", "ad_name"),
    objective:   g("목표", "목적", "objective"),
    spend:       num(g("지출 금액 (KRW)", "지출 금액", "amount_spent", "spend")),
    impressions: num(g("노출", "impressions")),
    clicks:      num(g("링크 클릭", "link_clicks")),
    clicksAll:   num(g("클릭(전체)", "clicks")),
    lpv:         num(g("랜딩 페이지 조회", "landing_page_views")),
    purchases:   num(g("공유 항목이 포함된 구매", "결과", "purchases", "result")),
    convValue:   num(g("공유 항목의 구매 전환값", "conversion_value")),
    cpc:         num(g("CPC(링크 클릭당 비용)", "cpc")),
    ctr:         num(g("CTR(전체)", "ctr")),
    cpm:         num(g("CPM(1,000회 노출당 비용)", "cpm")),
  };
}

function isConvCamp(objective, campaignName = "") {
  const obj = (objective || "").toUpperCase();
  if (["OUTCOME_SALES", "OUTCOME_ENGAGEMENT", "CONVERSIONS"].includes(obj)) return true;
  if (["LINK_CLICKS", "OUTCOME_TRAFFIC", "REACH", "BRAND_AWARENESS"].includes(obj)) return false;
  const name = (campaignName || "").toLowerCase();
  if (["전환", "conversion", "purchase", "구매", "sales"].some(k => name.includes(k))) return true;
  if (["트래픽", "traffic", "클릭", "link_click"].some(k => name.includes(k))) return false;
  return false;
}

function getAdMargin(adName, campaign, margins, def) {
  const text = (adName + " " + campaign).toLowerCase();
  const m = (margins || []).find(m => m.keyword && text.includes(m.keyword.toLowerCase()));
  return m ? m.margin : def;
}

function lpvCostStatus(spend, lpv, cr = DEFAULT_CRITERIA) {
  if (!lpv || !spend) return null;
  const cost = spend / lpv;
  if (cost < cr.lpv_great) return { label: "매우좋음", color: C.good, bg: C.goodLt, cost: Math.round(cost) };
  if (cost < cr.lpv_keep)  return { label: "유지",     color: C.accent, bg: C.accentLt, cost: Math.round(cost) };
  if (cost < cr.lpv_hold)  return { label: "보류",     color: C.warn, bg: C.warnLt, cost: Math.round(cost) };
  return                          { label: "컷",        color: C.bad,  bg: C.badLt,  cost: Math.round(cost) };
}
function ctrStatus(clicks, impressions, cr = DEFAULT_CRITERIA) {
  if (!impressions || !clicks) return null;
  const ctr = (clicks / impressions) * 100;
  if (ctr >= cr.ctr_good)   return { label: "좋음",    color: C.good, bg: C.goodLt, ctr: ctr.toFixed(2) };
  if (ctr >= cr.ctr_normal) return { label: "보통",    color: C.warn, bg: C.warnLt, ctr: ctr.toFixed(2) };
  return                           { label: "소재문제", color: C.bad,  bg: C.badLt,  ctr: ctr.toFixed(2) };
}
function lpvRateStatus(clicks, lpv, cr = DEFAULT_CRITERIA) {
  if (!clicks || !lpv) return null;
  const rate = (lpv / clicks) * 100;
  if (rate >= cr.lpvr_good)   return { label: "정상",    color: C.good, bg: C.goodLt, rate: rate.toFixed(1) };
  if (rate >= cr.lpvr_normal) return { label: "보통",    color: C.warn, bg: C.warnLt, rate: rate.toFixed(1) };
  return                             { label: "랜딩문제", color: C.bad,  bg: C.badLt,  rate: rate.toFixed(1) };
}
function cpaStatus(spend, purchases, margin, cr = DEFAULT_CRITERIA) {
  if (!purchases || !spend || !margin) return null;
  const cpa = spend / purchases;
  const ratio = (cpa / margin) * 100;
  if (ratio <= cr.cpa_keep) return { label: "유지", color: C.good, bg: C.goodLt, cpa: Math.round(cpa) };
  if (ratio <= cr.cpa_hold) return { label: "보류", color: C.warn, bg: C.warnLt, cpa: Math.round(cpa) };
  return                           { label: "컷",   color: C.bad,  bg: C.badLt,  cpa: Math.round(cpa) };
}
function roasStatus(convValue, spend, cr = DEFAULT_CRITERIA) {
  if (!convValue || !spend) return null;
  const roas = convValue / spend;
  if (roas >= cr.roas_great) return { label: "매우좋음", color: C.good, bg: C.goodLt, roas: roas.toFixed(2) };
  if (roas >= cr.roas_keep)  return { label: "유지",     color: C.accent, bg: C.accentLt, roas: roas.toFixed(2) };
  if (roas >= cr.roas_hold)  return { label: "보류",     color: C.warn, bg: C.warnLt, roas: roas.toFixed(2) };
  return                            { label: "컷",        color: C.bad,  bg: C.badLt,  roas: roas.toFixed(2) };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 공통 UI 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.white, border: `1px solid ${C.border}`,
    borderRadius: 18, padding: "20px 18px", ...style
  }}>{children}</div>
);

const CardTitle = ({ title, sub, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: C.inkLt, marginTop: 2 }}>{sub}</div>}
    </div>
    {action}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", small = false, disabled = false, style = {} }) => {
  const v = {
    primary: { background: C.accent,  color: C.white,  border: "none" },
    ghost:   { background: C.accentLt, color: C.accent, border: `1px solid ${C.accent}33` },
    danger:  { background: C.badLt,   color: C.bad,    border: `1px solid ${C.bad}33` },
    neutral: { background: C.bg,      color: C.inkMid, border: `1px solid ${C.border}` },
    good:    { background: C.goodLt,  color: C.good,   border: `1px solid ${C.good}44` },
    warn:    { background: C.warnLt,  color: C.warn,   border: `1px solid ${C.warn}44` },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...v, borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: FONT, fontWeight: 600, fontSize: small ? 11 : 13,
      padding: small ? "6px 12px" : "10px 18px",
      transition: "opacity 0.15s", opacity: disabled ? 0.4 : 1,
      whiteSpace: "nowrap", ...style
    }}>
      {children}
    </button>
  );
};

const Inp = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input
    type={type} value={value || ""} onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`,
      borderRadius: 12, fontSize: 13, color: C.ink, background: C.bg, outline: "none",
      fontFamily: FONT, boxSizing: "border-box", transition: "border-color 0.15s", ...style
    }}
    onFocus={e => e.target.style.borderColor = C.accent}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", fontSize: 11
    }}>
      <p style={{ color: C.inkMid, fontWeight: 700, marginBottom: 5 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: C.inkLt, margin: "2px 0" }}>
          {p.name}:{" "}
          <span style={{ color: C.ink, fontWeight: 700 }}>
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

const StatusBadge = ({ label, color, bg }) => (
  <span style={{
    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100,
    color, background: bg, border: `1px solid ${color}33`, whiteSpace: "nowrap"
  }}>{label}</span>
);

// KPI 카드
const KpiCard = ({ icon, label, value, note, accentColor }) => (
  <div style={{
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 14px",
    position: "relative", overflow: "hidden"
  }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accentColor || C.accent, borderRadius: "16px 16px 0 0" }} />
    <div style={{ fontSize: 11, color: C.inkLt, fontWeight: 600, marginBottom: 6, letterSpacing: "0.02em" }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
    {note && <div style={{ fontSize: 10, color: C.inkLt, marginTop: 5 }}>{note}</div>}
  </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function OaDashboard() {
  const dateStr = typeof window !== "undefined"
    ? new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const [sec, setSec] = useState("meta");
  const [metaTab, setMetaTab] = useState("overview");
  const [campTab, setCampTab] = useState("conversion");

  // 로고
  const [logo, setLogo] = useState(() => { try { return localStorage.getItem(LS_LOGO) || null; } catch { return null; } });
  const logoRef = useRef();

  // 데이터
  const [sheetUrl, setSheetUrl, sheetUrlLoaded] = useLocal(LS_SHEET_URL, "");
  const [margin, setMargin] = useLocal(LS_MARGIN, 30000);
  const [margins, setMargins] = useLocal(LS_MARGINS, DEFAULT_MARGINS);
  const [criteria, setCriteria] = useLocal(LS_CRITERIA, DEFAULT_CRITERIA);
  const [metaRaw, setMetaRaw] = useState([]);
  const [metaStatus, setMetaStatus] = useState("idle");
  const [deletedAds, setDeletedAds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("oa_deleted_ads") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    if (sheetUrlLoaded && sheetUrl) fetchSheet(sheetUrl);
  }, [sheetUrl, sheetUrlLoaded]);

  async function fetchSheet(url) {
    if (!url) return;
    setMetaStatus("loading");
    try {
      const res = await fetch(`/api/sheet?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const rows = parseCSV(text).map(mapMetaRow).filter(r => r.date || r.campaign);
      setMetaRaw(rows);
      setMetaStatus("ok");
    } catch (e) {
      setMetaStatus("error");
    }
  }

  const hasSheet = metaStatus === "ok" && metaRaw.length > 0;
  const metaFiltered = metaRaw.filter(r => !deletedAds.includes(r.adName || r.campaign || ""));

  // 집계
  const agg = hasSheet ? (() => {
    const totalSpend     = metaFiltered.reduce((s, r) => s + r.spend, 0);
    const totalClicks    = metaFiltered.reduce((s, r) => s + r.clicks, 0);
    const totalLpv       = metaFiltered.reduce((s, r) => s + r.lpv, 0);
    const totalPurchases = metaFiltered.reduce((s, r) => s + r.purchases, 0);
    const totalConvVal   = metaFiltered.reduce((s, r) => s + r.convValue, 0);
    const avgCtr = metaFiltered.length ? metaFiltered.reduce((s, r) => s + r.ctr, 0) / metaFiltered.length : 0;
    const avgCpc = totalClicks ? totalSpend / totalClicks : 0;
    const lpvRate = totalClicks ? (totalLpv / totalClicks) * 100 : 0;
    const roas = totalSpend ? totalConvVal / totalSpend : 0;

    // 날짜별
    const byDate = {};
    metaFiltered.forEach(r => {
      if (!r.date) return;
      if (!byDate[r.date]) byDate[r.date] = { day: r.date.slice(5).replace("-", "/"), spend: 0, clicks: 0, lpv: 0, ctr: 0, n: 0 };
      byDate[r.date].spend += r.spend;
      byDate[r.date].clicks += r.clicks;
      byDate[r.date].lpv += r.lpv;
      byDate[r.date].ctr += r.ctr;
      byDate[r.date].n++;
    });
    const daily = Object.values(byDate)
      .sort((a, b) => a.day.localeCompare(b.day))
      .map(d => ({ ...d, ctr: d.n ? +(d.ctr / d.n).toFixed(2) : 0 }));

    // 광고별
    const byAd = {};
    metaFiltered.forEach(r => {
      const key = r.adName || r.campaign || "unknown";
      if (!byAd[key]) byAd[key] = { name: r.adName || key, adset: r.adset || "", campaign: r.campaign || "", objective: r.objective || "", spend: 0, clicks: 0, lpv: 0, purchases: 0, convValue: 0, impressions: 0, ctrSum: 0, n: 0 };
      byAd[key].spend      += r.spend;
      byAd[key].clicks     += r.clicks;
      byAd[key].lpv        += r.lpv;
      byAd[key].purchases  += r.purchases;
      byAd[key].convValue  += r.convValue;
      byAd[key].impressions += r.impressions;
      byAd[key].ctrSum     += r.ctr;
      byAd[key].n++;
    });
    const ads = Object.values(byAd).map(c => ({
      ...c,
      cpa:     c.purchases > 0 ? Math.round(c.spend / c.purchases) : 0,
      roas:    c.convValue > 0 && c.spend > 0 ? +(c.convValue / c.spend).toFixed(2) : 0,
      lpvRate: c.clicks > 0 ? Math.round((c.lpv / c.clicks) * 100) : 0,
      cpc:     c.clicks > 0 ? Math.round(c.spend / c.clicks) : 0,
      ctr:     c.n > 0 ? +(c.ctrSum / c.n).toFixed(2) : 0,
    }));
    const convAds    = ads.filter(c => isConvCamp(c.objective, c.campaign));
    const trafficAds = ads.filter(c => !convAds.includes(c));

    return { totalSpend, totalClicks, totalLpv, totalPurchases, totalConvVal, avgCtr, avgCpc, lpvRate, roas, daily, ads, convAds, trafficAds };
  })() : null;

  // 광고 판단
  const adJudge = hasSheet ? (() => {
    const byAd = {};
    metaFiltered.forEach(r => {
      const key = r.adName || r.campaign || "";
      if (!key) return;
      if (!byAd[key]) byAd[key] = { ...r, name: key };
      else {
        byAd[key].spend      += r.spend;
        byAd[key].clicks     += r.clicks;
        byAd[key].lpv        += r.lpv;
        byAd[key].purchases  += r.purchases;
        byAd[key].impressions += r.impressions;
      }
    });
    return Object.values(byAd);
  })() : [];

  const cutAds  = adJudge.filter(ad => {
    const m = getAdMargin(ad.name, ad.campaign, margins, margin);
    const lpvC = lpvCostStatus(ad.spend, ad.lpv, criteria);
    const cpaJ = cpaStatus(ad.spend, ad.purchases, m, criteria);
    const lpvR = lpvRateStatus(ad.clicks, ad.lpv, criteria);
    return [lpvC, cpaJ, lpvR].some(s => s?.label === "컷" || s?.label === "랜딩문제");
  });
  const holdAds = adJudge.filter(ad => {
    if (cutAds.includes(ad)) return false;
    const m = getAdMargin(ad.name, ad.campaign, margins, margin);
    const lpvC = lpvCostStatus(ad.spend, ad.lpv, criteria);
    const cpaJ = cpaStatus(ad.spend, ad.purchases, m, criteria);
    const ctrJ = ctrStatus(ad.clicks, ad.impressions, criteria);
    return [lpvC, cpaJ, ctrJ].some(s => s?.label === "보류" || s?.label === "보통");
  });

  const NAVS = [
    { id: "meta",         label: "메타광고", icon: "📊" },
    { id: "metaSettings", label: "광고 설정", icon: "⚙️" },
  ];

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target.result;
      setLogo(url);
      try { localStorage.setItem(LS_LOGO, url); } catch {}
    };
    reader.readAsDataURL(file);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 메타광고 섹션
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const MetaSection = (() => {
    const d = agg;
    const fmt = n => n >= 1000 ? `₩${Math.round(n / 1000).toLocaleString()}K` : `₩${Math.round(n)}`;

    const kpis = d ? [
      { label: "총 광고비",  value: fmt(d.totalSpend),                      note: `${d.daily.length}일`,            accentColor: C.bad },
      { label: "클릭수",     value: d.totalClicks.toLocaleString(),          note: `CPC ${fmt(d.avgCpc)}`,           accentColor: C.accent },
      { label: "LPV",       value: d.totalLpv.toLocaleString(),             note: `전환율 ${d.lpvRate.toFixed(1)}%`, accentColor: C.blue },
      { label: "구매",       value: `${d.totalPurchases}건`,                 note: d.totalConvVal > 0 ? `전환값 ${fmt(d.totalConvVal)}` : "", accentColor: C.good },
      { label: "ROAS",      value: d.roas > 0 ? `${d.roas.toFixed(2)}x` : "—", note: "전환값 ÷ 광고비",             accentColor: C.purple },
      { label: "평균 CTR",  value: `${d.avgCtr.toFixed(2)}%`,               note: "클릭률",                         accentColor: C.warn },
    ] : [
      { label: "총 광고비",  value: "—", note: "시트 연결 필요", accentColor: C.bad },
      { label: "클릭수",     value: "—", note: "시트 연결 필요", accentColor: C.accent },
      { label: "LPV",       value: "—", note: "시트 연결 필요", accentColor: C.blue },
      { label: "구매",       value: "—", note: "시트 연결 필요", accentColor: C.good },
      { label: "ROAS",      value: "—", note: "시트 연결 필요", accentColor: C.purple },
      { label: "평균 CTR",  value: "—", note: "시트 연결 필요", accentColor: C.warn },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* 광고 알림 배너 */}
        {(cutAds.length > 0 || holdAds.length > 0) && (
          <div style={{ display: "flex", gap: 10 }}>
            {cutAds.length > 0 && (
              <div style={{ flex: 1, background: C.badLt, border: `1px solid ${C.bad}33`, borderRadius: 14, padding: "12px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.bad }}>교체 필요 {cutAds.length}개</div>
                <div style={{ fontSize: 11, color: C.bad, opacity: 0.7, marginTop: 2 }}>즉시 검토 필요</div>
              </div>
            )}
            {holdAds.length > 0 && (
              <div style={{ flex: 1, background: C.warnLt, border: `1px solid ${C.warn}33`, borderRadius: 14, padding: "12px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.warn }}>보류 검토 {holdAds.length}개</div>
                <div style={{ fontSize: 11, color: C.warn, opacity: 0.7, marginTop: 2 }}>모니터링 필요</div>
              </div>
            )}
          </div>
        )}

        {/* 시트 연결 상태 */}
        <div style={{
          background: C.white, border: `1px solid ${hasSheet ? C.good + "66" : C.border}`,
          borderRadius: 14, padding: "14px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: hasSheet ? C.good : metaStatus === "loading" ? C.warn : metaStatus === "error" ? C.bad : C.inkLt,
              flexShrink: 0
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                {hasSheet ? `구글 시트 연결됨 · ${metaRaw.length}행` : metaStatus === "loading" ? "불러오는 중..." : metaStatus === "error" ? "연결 실패" : "시트 미연결"}
              </div>
              {deletedAds.length > 0 && <div style={{ fontSize: 11, color: C.inkLt, marginTop: 1 }}>{deletedAds.length}개 숨김</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {hasSheet && <Btn variant="good" small onClick={() => fetchSheet(sheetUrl)}>새로고침</Btn>}
            {deletedAds.length > 0 && (
              <Btn variant="neutral" small onClick={() => { setDeletedAds([]); try { localStorage.removeItem("oa_deleted_ads"); } catch {} }}>
                숨김 복원 ({deletedAds.length})
              </Btn>
            )}
            <Btn variant={hasSheet ? "neutral" : "primary"} small onClick={() => setSec("metaSettings")}>
              {hasSheet ? "설정" : "시트 연결"}
            </Btn>
          </div>
        </div>

        {/* KPI */}
        <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 0, background: C.bg, borderRadius: 12, padding: 4, width: "fit-content" }}>
          {[{ id: "overview", label: "추이" }, { id: "campaign", label: "캠페인" }, { id: "alert", label: `판단 ${cutAds.length + holdAds.length > 0 ? `(${cutAds.length + holdAds.length})` : ""}` }].map(t => (
            <button key={t.id} onClick={() => setMetaTab(t.id)} style={{
              padding: "7px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: FONT,
              fontSize: 12, fontWeight: 600,
              background: metaTab === t.id ? C.white : "transparent",
              color: metaTab === t.id ? C.ink : C.inkLt,
              boxShadow: metaTab === t.id ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s"
            }}>{t.label}</button>
          ))}
        </div>

        {/* 추이 탭 */}
        {metaTab === "overview" && (
          <>
            {!hasSheet ? (
              <Card style={{ textAlign: "center", padding: "48px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 6 }}>구글 시트를 연결해주세요</div>
                <div style={{ fontSize: 13, color: C.inkLt, marginBottom: 20 }}>메타 광고관리자 데이터를 시트에 붙여넣으면 차트가 자동으로 그려져요</div>
                <Btn onClick={() => setSec("metaSettings")}>시트 연결하기</Btn>
              </Card>
            ) : d && (
              <>
                <Card>
                  <CardTitle title="클릭 · LPV 추이" sub="일별 클릭 대비 랜딩 도달" />
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={d.daily}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.accent} stopOpacity={0.15} /><stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.good} stopOpacity={0.15} /><stop offset="95%" stopColor={C.good} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: C.inkLt }} axisLine={false} tickLine={false} interval={Math.floor(d.daily.length / 7)} />
                      <YAxis tick={{ fontSize: 10, fill: C.inkLt }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="clicks" stroke={C.accent} strokeWidth={2} fill="url(#g1)" name="클릭수" />
                      <Area type="monotone" dataKey="lpv"    stroke={C.good}   strokeWidth={2} fill="url(#g2)" name="LPV" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", marginTop: 8 }}>
                    {[{ c: C.accent, l: "클릭수" }, { c: C.good, l: "LPV" }].map(({ c, l }) => (
                      <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.inkLt }}>
                        <div style={{ width: 12, height: 3, background: c, borderRadius: 2 }} />{l}
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="chart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Card>
                    <CardTitle title="일별 광고비" sub="소진 패턴" />
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={d.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: C.inkLt }} axisLine={false} tickLine={false} interval={Math.floor(d.daily.length / 5)} />
                        <YAxis tick={{ fontSize: 9, fill: C.inkLt }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="spend" fill={C.accent} radius={[4, 4, 0, 0]} name="광고비(₩)" opacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                  <Card>
                    <CardTitle title="CTR 추이" sub="일별 클릭률" />
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={d.daily}>
                        <defs>
                          <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.warn} stopOpacity={0.15} /><stop offset="95%" stopColor={C.warn} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: C.inkLt }} axisLine={false} tickLine={false} interval={Math.floor(d.daily.length / 5)} />
                        <YAxis tick={{ fontSize: 9, fill: C.inkLt }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="ctr" stroke={C.warn} strokeWidth={2} fill="url(#g3)" name="CTR(%)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* LPV 전환율 요약 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { label: "LPV 전환율", value: `${d.lpvRate.toFixed(1)}%`, note: "클릭 → 랜딩 도달", color: d.lpvRate >= 70 ? C.good : d.lpvRate >= 50 ? C.warn : C.bad },
                    { label: "평균 CPC", value: `₩${Math.round(d.avgCpc).toLocaleString()}`, note: "클릭당 비용", color: C.ink },
                    { label: "총 캠페인", value: `${d.ads.length}개`, note: `전환 ${d.convAds.length} · 트래픽 ${d.trafficAds.length}`, color: C.ink },
                  ].map((s, i) => (
                    <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, color: C.inkLt, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: C.inkLt, marginTop: 3 }}>{s.note}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* 캠페인 탭 */}
        {metaTab === "campaign" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!hasSheet ? (
              <Card style={{ textAlign: "center", padding: "48px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📣</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 16 }}>시트 연결 후 캠페인 데이터가 표시됩니다</div>
                <Btn onClick={() => setSec("metaSettings")}>시트 연결하기</Btn>
              </Card>
            ) : d && (
              <>
                <div style={{ display: "flex", gap: 0, background: C.bg, borderRadius: 10, padding: 3, width: "fit-content" }}>
                  {[{ id: "conversion", label: "전환 캠페인" }, { id: "traffic", label: "트래픽 캠페인" }].map(t => (
                    <button key={t.id} onClick={() => setCampTab(t.id)} style={{
                      padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: FONT,
                      fontSize: 12, fontWeight: 600,
                      background: campTab === t.id ? C.white : "transparent",
                      color: campTab === t.id ? C.ink : C.inkLt,
                      boxShadow: campTab === t.id ? "0 2px 6px rgba(0,0,0,0.07)" : "none",
                      transition: "all 0.15s"
                    }}>{t.label}</button>
                  ))}
                </div>

                {(() => {
                  const camps = campTab === "conversion" ? d.convAds : d.trafficAds;
                  if (!camps || camps.length === 0) return (
                    <Card style={{ textAlign: "center", padding: "32px" }}>
                      <div style={{ fontSize: 13, color: C.inkLt }}>해당 유형의 캠페인 데이터가 없습니다</div>
                    </Card>
                  );

                  const totalSpend  = camps.reduce((s, c) => s + c.spend, 0);
                  const totalPurch  = camps.reduce((s, c) => s + c.purchases, 0);
                  const totalConvV  = camps.reduce((s, c) => s + c.convValue, 0);
                  const totalClicks = camps.reduce((s, c) => s + c.clicks, 0);
                  const totalLpv    = camps.reduce((s, c) => s + c.lpv, 0);
                  const avgCtr      = camps.length ? camps.reduce((s, c) => s + c.ctr, 0) / camps.length : 0;

                  const summaries = campTab === "conversion" ? [
                    { label: "광고비",  value: `₩${Math.round(totalSpend / 1000).toLocaleString()}K` },
                    { label: "구매",    value: `${totalPurch}건` },
                    { label: "전환값",  value: `₩${Math.round(totalConvV / 1000).toLocaleString()}K` },
                    { label: "ROAS",   value: totalSpend > 0 ? `${+(totalConvV / totalSpend).toFixed(2)}x` : "—" },
                    { label: "CPA",    value: totalPurch > 0 ? `₩${Math.round(totalSpend / totalPurch).toLocaleString()}` : "—" },
                  ] : [
                    { label: "광고비",  value: `₩${Math.round(totalSpend / 1000).toLocaleString()}K` },
                    { label: "클릭",   value: totalClicks.toLocaleString() },
                    { label: "LPV",   value: totalLpv.toLocaleString() },
                    { label: "CPC",   value: totalClicks > 0 ? `₩${Math.round(totalSpend / totalClicks).toLocaleString()}` : "—" },
                    { label: "CTR",   value: `${avgCtr.toFixed(2)}%` },
                  ];

                  return (
                    <>
                      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                        {summaries.map((s, i) => (
                          <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", textAlign: "center", minWidth: 100, flex: "0 0 auto" }}>
                            <div style={{ fontSize: 10, color: C.inkLt, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{s.value}</div>
                          </div>
                        ))}
                      </div>

                      <Card style={{ padding: 0, overflow: "hidden" }}>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                                {(campTab === "conversion"
                                  ? ["광고명", "광고세트", "광고비", "구매", "전환값", "CPA", "ROAS", "LPV율", ""]
                                  : ["광고명", "광고세트", "광고비", "클릭", "LPV", "CPC", "CTR", "LPV율", ""]
                                ).map((h, i) => (
                                  <th key={i} style={{ padding: "12px 12px", textAlign: i === 0 || i === 1 ? "left" : "right", color: C.inkLt, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {camps.map((c, i) => {
                                const m = getAdMargin(c.name, c.campaign, margins, margin);
                                const lpvC = lpvCostStatus(c.spend, c.lpv, criteria);
                                const cpaJ = criteria.use_roas ? roasStatus(c.convValue, c.spend, criteria) : cpaStatus(c.spend, c.purchases, m, criteria);
                                const ctrJ = ctrStatus(c.clicks, c.impressions, criteria);
                                return (
                                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}
                                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <td style={{ padding: "12px 12px", maxWidth: 200 }}>
                                      <div style={{ fontWeight: 600, color: C.ink, fontSize: 12, wordBreak: "break-all", marginBottom: 4 }}>{c.name}</div>
                                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                        {lpvC && <StatusBadge label={`LPV ${lpvC.label}`} color={lpvC.color} bg={lpvC.bg} />}
                                        {cpaJ && <StatusBadge label={`${criteria.use_roas ? "ROAS" : "CPA"} ${cpaJ.label}`} color={cpaJ.color} bg={cpaJ.bg} />}
                                      </div>
                                    </td>
                                    <td style={{ padding: "12px 12px", maxWidth: 140 }}>
                                      <div style={{ fontSize: 11, color: C.inkLt, wordBreak: "break-all" }}>{c.adset || "—"}</div>
                                    </td>
                                    <td style={{ padding: "12px 12px", textAlign: "right", color: C.inkMid }}>₩{Math.round(c.spend / 1000).toLocaleString()}K</td>
                                    {campTab === "conversion" ? (
                                      <>
                                        <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 700, color: c.purchases > 0 ? C.good : C.inkLt }}>{c.purchases || "—"}</td>
                                        <td style={{ padding: "12px 12px", textAlign: "right", color: C.inkMid }}>{c.convValue > 0 ? `₩${Math.round(c.convValue / 1000).toLocaleString()}K` : "—"}</td>
                                        <td style={{ padding: "12px 12px", textAlign: "right" }}>
                                          {c.cpa > 0 ? <StatusBadge label={`₩${c.cpa.toLocaleString()}`} color={cpaJ?.color || C.inkMid} bg={cpaJ?.bg || C.bg} /> : <span style={{ color: C.inkLt }}>—</span>}
                                        </td>
                                        <td style={{ padding: "12px 12px", textAlign: "right" }}>
                                          {c.roas > 0 ? <StatusBadge label={`${c.roas}x`} color={c.roas >= criteria.roas_great ? C.good : c.roas >= criteria.roas_keep ? C.accent : C.warn} bg={c.roas >= criteria.roas_great ? C.goodLt : c.roas >= criteria.roas_keep ? C.accentLt : C.warnLt} /> : <span style={{ color: C.inkLt }}>—</span>}
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td style={{ padding: "12px 12px", textAlign: "right", color: C.inkMid }}>{c.clicks.toLocaleString()}</td>
                                        <td style={{ padding: "12px 12px", textAlign: "right", color: C.inkMid }}>{c.lpv.toLocaleString()}</td>
                                        <td style={{ padding: "12px 12px", textAlign: "right" }}>
                                          <StatusBadge label={`₩${c.cpc}`} color={C.inkMid} bg={C.bg} />
                                        </td>
                                        <td style={{ padding: "12px 12px", textAlign: "right" }}>
                                          {ctrJ ? <StatusBadge label={`${c.ctr}%`} color={ctrJ.color} bg={ctrJ.bg} /> : <span style={{ color: C.inkLt }}>—</span>}
                                        </td>
                                      </>
                                    )}
                                    <td style={{ padding: "12px 12px", textAlign: "right" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                                        <div style={{ width: 30, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                                          <div style={{ height: "100%", width: `${Math.min(c.lpvRate, 100)}%`, background: c.lpvRate >= criteria.lpvr_good ? C.good : C.warn, borderRadius: 2 }} />
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: c.lpvRate >= criteria.lpvr_good ? C.good : C.warn }}>{c.lpvRate}%</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: "12px 12px", textAlign: "right" }}>
                                      <button onClick={() => {
                                        const next = [...deletedAds, c.name];
                                        setDeletedAds(next);
                                        try { localStorage.setItem("oa_deleted_ads", JSON.stringify(next)); } catch {}
                                      }} style={{
                                        background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                                        width: 24, height: 24, cursor: "pointer", fontSize: 11, color: C.inkLt,
                                        display: "flex", alignItems: "center", justifyContent: "center"
                                      }} title="숨기기">✕</button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* 판단 탭 */}
        {metaTab === "alert" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!hasSheet ? (
              <Card style={{ textAlign: "center", padding: "48px 20px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 16 }}>시트 연결 후 판단 결과가 표시됩니다</div>
                <Btn onClick={() => setSec("metaSettings")}>시트 연결하기</Btn>
              </Card>
            ) : cutAds.length === 0 && holdAds.length === 0 ? (
              <Card style={{ textAlign: "center", padding: "48px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>모든 광고 정상</div>
                <div style={{ fontSize: 13, color: C.inkLt, marginTop: 4 }}>교체·보류 기준 초과 광고 없음</div>
              </Card>
            ) : (
              <>
                {cutAds.map((ad, i) => {
                  const m = getAdMargin(ad.name, ad.campaign, margins, margin);
                  const lpvC = lpvCostStatus(ad.spend, ad.lpv, criteria);
                  const lpvR = lpvRateStatus(ad.clicks, ad.lpv, criteria);
                  const cpaJ = cpaStatus(ad.spend, ad.purchases, m, criteria);
                  const ctrJ = ctrStatus(ad.clicks, ad.impressions, criteria);
                  return (
                    <Card key={i} style={{ border: `1px solid ${C.bad}44` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{ad.name}</div>
                          <div style={{ fontSize: 11, color: C.inkLt, marginTop: 2 }}>{ad.adset || ad.campaign}</div>
                        </div>
                        <StatusBadge label="교체 필요" color={C.bad} bg={C.badLt} />
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {lpvC && <StatusBadge label={`LPV단가 ${lpvC.label} (₩${lpvC.cost})`} color={lpvC.color} bg={lpvC.bg} />}
                        {lpvR && <StatusBadge label={`LPV전환율 ${lpvR.label} (${lpvR.rate}%)`} color={lpvR.color} bg={lpvR.bg} />}
                        {cpaJ && <StatusBadge label={`CPA ${cpaJ.label} (₩${cpaJ.cpa?.toLocaleString()})`} color={cpaJ.color} bg={cpaJ.bg} />}
                        {ctrJ && <StatusBadge label={`CTR ${ctrJ.label} (${ctrJ.ctr}%)`} color={ctrJ.color} bg={ctrJ.bg} />}
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {[
                          { l: "광고비", v: `₩${Math.round(ad.spend / 1000)}K` },
                          { l: "클릭", v: (ad.clicks || 0).toLocaleString() },
                          { l: "LPV", v: (ad.lpv || 0).toLocaleString() },
                          ...(ad.purchases > 0 ? [{ l: "구매", v: ad.purchases }] : []),
                        ].map(({ l, v }) => (
                          <div key={l} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 10, color: C.inkLt }}>{l}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
                {holdAds.map((ad, i) => {
                  const m = getAdMargin(ad.name, ad.campaign, margins, margin);
                  const lpvC = lpvCostStatus(ad.spend, ad.lpv, criteria);
                  const cpaJ = cpaStatus(ad.spend, ad.purchases, m, criteria);
                  const ctrJ = ctrStatus(ad.clicks, ad.impressions, criteria);
                  return (
                    <Card key={i} style={{ border: `1px solid ${C.warn}44` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{ad.name}</div>
                          <div style={{ fontSize: 11, color: C.inkLt, marginTop: 2 }}>{ad.adset || ad.campaign}</div>
                        </div>
                        <StatusBadge label="보류 검토" color={C.warn} bg={C.warnLt} />
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {lpvC && <StatusBadge label={`LPV단가 ${lpvC.label}`} color={lpvC.color} bg={lpvC.bg} />}
                        {cpaJ && <StatusBadge label={`CPA ${cpaJ.label}`} color={cpaJ.color} bg={cpaJ.bg} />}
                        {ctrJ && <StatusBadge label={`CTR ${ctrJ.label}`} color={ctrJ.color} bg={ctrJ.bg} />}
                      </div>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    );
  })();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: FONT, color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; } button { font-family: inherit; }
        input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { height: 4px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }

        .oa-sidebar {
          width: 240px; flex-shrink: 0;
          background: ${C.white}; border-right: 1px solid ${C.border};
          position: fixed; top: 0; left: 0; bottom: 0;
          display: flex; flex-direction: column;
          z-index: 100;
        }
        .oa-main { margin-left: 240px; padding: 32px 36px 80px; max-width: 1200px; }
        .oa-topbar { display: none; }
        .oa-mobile-nav { display: none !important; }
        .kpi-grid { grid-template-columns: repeat(6, 1fr) !important; }
        .chart-grid { grid-template-columns: 1fr 1fr !important; }

        @media (max-width: 900px) {
          .oa-sidebar { display: none !important; }
          .oa-topbar { display: flex !important; }
          .oa-main { margin-left: 0 !important; padding: 14px 14px 80px !important; }
          .oa-mobile-nav { display: flex !important; }
          .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .chart-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* 사이드바 */}
      <aside className="oa-sidebar">
        <div style={{ padding: "28px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
          {/* 로고 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div
              onClick={() => logoRef.current?.click()}
              style={{
                width: 40, height: 40, borderRadius: 12, overflow: "hidden", flexShrink: 0,
                border: `1.5px dashed ${logo ? "transparent" : C.border}`,
                background: logo ? "transparent" : C.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 18
              }}
              title="로고 업로드"
            >
              {logo ? <img src={logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "＋"}
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>OA Beauty</div>
              <div style={{ fontSize: 10, color: C.inkLt, marginTop: 1 }}>Marketing Dashboard</div>
            </div>
          </div>

          {/* 상태 */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
            background: C.bg, borderRadius: 10, fontSize: 11, color: C.inkLt, fontWeight: 500
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: hasSheet ? C.good : C.inkLt, flexShrink: 0 }} />
            {dateStr}
          </div>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {NAVS.map(n => {
            const active = sec === n.id;
            return (
              <button key={n.id} onClick={() => setSec(n.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 12, border: "none", cursor: "pointer",
                fontFamily: FONT, fontWeight: 600, fontSize: 13, marginBottom: 4,
                textAlign: "left", transition: "all 0.15s",
                background: active ? C.accentLt : "transparent",
                color: active ? C.accent : C.inkMid,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.bg; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: 17, lineHeight: 1 }}>{n.icon}</span>
                <span>{n.label}</span>
                {n.id === "meta" && (cutAds.length + holdAds.length) > 0 && (
                  <span style={{
                    marginLeft: "auto", minWidth: 20, height: 20, borderRadius: 10,
                    background: C.bad, color: C.white, fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px"
                  }}>{cutAds.length + holdAds.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 하단 연결 상태 */}
        <div style={{ padding: "0 12px 24px" }}>
          <div style={{
            background: hasSheet ? C.goodLt : C.bg, border: `1px solid ${hasSheet ? C.good + "44" : C.border}`,
            borderRadius: 12, padding: "12px 14px"
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: hasSheet ? C.good : C.inkLt, marginBottom: 2 }}>
              {hasSheet ? "데이터 연결됨" : "데이터 미연결"}
            </div>
            <div style={{ fontSize: 10, color: C.inkLt }}>
              {hasSheet ? `${metaRaw.length}행 · ${agg?.ads.length || 0}개 광고` : "광고 설정에서 연결"}
            </div>
          </div>
        </div>
      </aside>

      {/* 모바일 상단바 */}
      <header className="oa-topbar" style={{
        background: C.white, borderBottom: `1px solid ${C.border}`,
        padding: "0 16px", height: 54, alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {logo
            ? <img src={logo} alt="logo" style={{ width: 30, height: 30, objectFit: "contain", borderRadius: 8 }} />
            : <div style={{ width: 30, height: 30, background: C.accentLt, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📊</div>
          }
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>OA Beauty</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {(cutAds.length + holdAds.length) > 0 && (
            <div style={{ padding: "4px 10px", background: C.badLt, borderRadius: 100, fontSize: 11, color: C.bad, fontWeight: 700 }}>
              광고 {cutAds.length + holdAds.length}건
            </div>
          )}
        </div>
      </header>

      {/* 본문 */}
      <main className="oa-main">
        {/* 페이지 헤더 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
            {sec === "meta" ? "메타광고" : "광고 설정"}
          </div>
          <div style={{ fontSize: 13, color: C.inkLt, marginTop: 3 }}>
            {sec === "meta" ? "광고 성과 및 판단 현황" : "데이터 소스 · 마진 · 판단 기준"}
          </div>
        </div>

        {sec === "meta" && MetaSection}
        {sec === "metaSettings" && (
          <MetaSettings
            sheetUrl={sheetUrl}
            onSheetUrlChange={setSheetUrl}
            metaStatus={metaStatus}
            metaRaw={metaRaw}
            deletedAds={deletedAds}
            onDeletedAdsChange={(arr) => { setDeletedAds(arr); try { localStorage.setItem("oa_deleted_ads", JSON.stringify(arr)); } catch {} }}
            margin={margin}
            onMarginChange={setMargin}
            margins={margins}
            onMarginsChange={setMargins}
            fetchSheet={fetchSheet}
            criteria={criteria}
            onCriteriaChange={setCriteria}
          />
        )}
      </main>

      {/* 모바일 하단 탭 */}
      <nav className="oa-mobile-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: C.white, borderTop: `1px solid ${C.border}`,
        padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
        zIndex: 200, display: "flex"
      }}>
        {NAVS.map(n => (
          <button key={n.id} onClick={() => setSec(n.id)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: "transparent", border: "none", cursor: "pointer", padding: "4px 0", fontFamily: FONT
          }}>
            <span style={{ fontSize: 20 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: sec === n.id ? C.accent : C.inkLt }}>{n.label}</span>
            {sec === n.id && <div style={{ width: 16, height: 2, background: C.accent, borderRadius: 1 }} />}
          </button>
        ))}
      </nav>
    </div>
  );
}
