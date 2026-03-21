import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "提交简历 | DirectHR",
  description: "上传您的简历，探索职业机会。DirectHR 帮助优秀人才与企业高效对接。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  );
}
