"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string;
  color?: "green" | "red" | "neutral" | "gold";
  icon: ReactNode;
  delay?: number;
}

const colorMap = {
  green: "text-green-400",
  red: "text-red-400",
  neutral: "text-[#e4e4e7]",
  gold: "text-[#f5a623]",
};

export default function KpiCard({ label, value, color = "neutral", icon, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 min-w-[160px] flex-shrink-0 hover:border-[#2e2e3e] transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[#a1a1aa]">{icon}</span>
        <span className="text-[#a1a1aa] text-xs font-medium truncate">{label}</span>
      </div>
      <p className={`font-mono text-xl font-bold ${colorMap[color]} animate-count-up`}>{value}</p>
    </motion.div>
  );
}
