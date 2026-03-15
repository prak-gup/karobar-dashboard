"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export default function ChartCard({ title, subtitle, children, className = "", action }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className={`bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[#e4e4e7] font-semibold text-sm">{title}</h3>
          {subtitle && <p className="text-[#a1a1aa] text-xs mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </motion.div>
  );
}
