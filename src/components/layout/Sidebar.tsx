"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PieChart,
  LayoutGrid,
  Thermometer,
  Map,
  Clock,
  FileText,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Newsroom", icon: LayoutDashboard },
  { href: "/content", label: "Content Mix", icon: PieChart },
  { href: "/placement", label: "Placement", icon: LayoutGrid },
  { href: "/sentiment", label: "Sentiment", icon: Thermometer },
  { href: "/coverage", label: "Coverage", icon: Map },
  { href: "/rhythm", label: "Rhythm", icon: Clock },
  { href: "/articles", label: "Articles", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2">
          <span className="text-[#f5a623] font-bold text-lg">Karobar</span>
          <span className="text-[#a1a1aa] text-sm">Intelligence</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-[#a1a1aa] p-1">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-sm pt-14">
          <nav className="flex flex-col gap-1 p-4">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? "bg-[#f5a623]/10 text-[#f5a623]"
                      : "text-[#a1a1aa] hover:text-[#e4e4e7] hover:bg-[#1e1e2e]"
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 bg-[#0a0a0f] border-r border-[#1e1e2e] z-40">
        <div className="px-5 py-6 border-b border-[#1e1e2e]">
          <h1 className="text-[#f5a623] font-bold text-xl tracking-tight">Karobar</h1>
          <p className="text-[#a1a1aa] text-xs mt-0.5">Editorial Intelligence</p>
        </div>
        <nav className="flex-1 flex flex-col gap-0.5 p-3 mt-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                  active
                    ? "bg-[#f5a623]/10 text-[#f5a623] font-medium"
                    : "text-[#a1a1aa] hover:text-[#e4e4e7] hover:bg-[#1e1e2e]/60"
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-[#1e1e2e]">
          <p className="text-[10px] text-[#a1a1aa]/60 leading-tight">
            Data Source: Amar Ujala<br />Karobar Section
          </p>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-sm border-t border-[#1e1e2e] flex justify-around py-1.5 px-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors ${
                active ? "text-[#f5a623]" : "text-[#a1a1aa]"
              }`}
            >
              <item.icon size={18} />
              <span className="text-[9px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
