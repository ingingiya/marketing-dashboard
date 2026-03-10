import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OA HQ",
  description: "OA Beauty 마케팅 운영 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
