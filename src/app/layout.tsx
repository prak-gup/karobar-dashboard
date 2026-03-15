import type { Metadata } from "next";
import { DataProvider } from "@/lib/data";
import Sidebar from "@/components/layout/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Karobar Intelligence | January 2026",
  description: "Financial intelligence dashboard — Amar Ujala Karobar Section Analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0a0a0f] text-[#e4e4e7] antialiased">
        <DataProvider>
          <Sidebar />
          <main className="lg:ml-56 pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">{children}</main>
        </DataProvider>
      </body>
    </html>
  );
}
