import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "智能翻译 | 专业多语言翻译平台",
  description:
    "智能翻译平台提供高精度、高效率的多语言翻译服务，支持实时翻译和文档处理",
  icons: {
    icon: [
      {
        url: "/icons/favicon.svg",
        type: "image/svg+xml"
      }
    ]
  },
  keywords: ["翻译", "多语言", "AI翻译", "文档翻译", "专业翻译", "智能翻译"],
  authors: [{ name: "智能翻译团队" }],
  creator: "智能翻译",
  publisher: "智能翻译科技"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
