import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "url 파라미터 필요" }, { status: 400 });
  }

  // 구글 시트 공유 URL → CSV export URL 변환
  // https://docs.google.com/spreadsheets/d/ID/edit#gid=GID
  // → https://docs.google.com/spreadsheets/d/ID/export?format=csv&gid=GID
  let csvUrl = rawUrl;
  const matchId = rawUrl.match(/spreadsheets\/d\/([^/]+)/);
  if (matchId) {
    const sheetId = matchId[1];
    const gidMatch = rawUrl.match(/[#&?]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";
    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }

  try {
    const res = await fetch(csvUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      // Vercel Edge: 캐시 안 함
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `시트 불러오기 실패: HTTP ${res.status}` },
        { status: res.status }
      );
    }
    const text = await res.text();
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
