import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "remAIn",
  description: "회상 대화 운영 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}