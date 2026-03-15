"use client";

import { useDataContext } from "@/lib/data";
import { formatDate, formatDateFull, CHART_COLORS } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { AlertTriangle, TrendingDown, Activity, Zap } from "lucide-react";
import { motion } from "framer-motion";

/* ---------- constants ---------- */

const RISK_COLORS: Record<string, string> = {
  market_warnings: "#ef4444",
  credit_risk: "#f59e0b",
  global_risks: "#3b82f6",
  regulatory_risks: "#8b5cf6",
};

const RISK_LABELS: Record<string, string> = {
  market_warnings: "Market Warnings",
  credit_risk: "Credit Risk",
  global_risks: "Global Risks",
  regulatory_risks: "Regulatory Risks",
};

const RISK_ICONS: Record<string, React.ReactNode> = {
  market_warnings: <TrendingDown size={18} />,
  credit_risk: <AlertTriangle size={18} />,
  global_risks: <Activity size={18} />,
  regulatory_risks: <Zap size={18} />,
};

/* ---------- helpers ---------- */

function sentimentLabel(score: number): string {
  if (score >= 0.3) return "Positive";
  if (score >= 0.05) return "Mildly +ve";
  if (score >= -0.05) return "Neutral";
  if (score >= -0.3) return "Mildly -ve";
  return "Negative";
}

function sentimentColorClass(score: number): string {
  if (score >= 0.05) return "text-green-400";
  if (score >= -0.05) return "text-zinc-400";
  return "text-red-400";
}

function zScoreColor(z: number): string {
  const abs = Math.abs(z);
  if (abs > 2) return "text-red-400";
  if (abs > 1) return "text-amber-400";
  return "text-yellow-400";
}

function zScoreBg(z: number): string {
  const abs = Math.abs(z);
  if (abs > 2) return "bg-red-500/15 border-red-500/30";
  if (abs > 1) return "bg-amber-500/15 border-amber-500/30";
  return "bg-yellow-500/15 border-yellow-500/30";
}

/* ---------- tooltip ---------- */

function RiskTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-[#a1a1aa] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-mono font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export default function RiskPage() {
  const { data, loading, error } = useDataContext();

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return <div className="p-8 text-red-400">Error: {error}</div>;

  const { risk_signals, anomalies } = data.analyses;

  /* --- Risk overview entries --- */
  const riskCategories = [
    { key: "market_warnings", data: risk_signals.market_warnings },
    { key: "credit_risk", data: risk_signals.credit_risk },
    { key: "global_risks", data: risk_signals.global_risks },
    { key: "regulatory_risks", data: risk_signals.regulatory_risks },
  ];

  const totalRiskArticles = riskCategories.reduce((sum, r) => sum + r.data.count, 0);

  /* --- Risk timeline chart data --- */
  const riskTimelineData = Object.entries(risk_signals.risk_timeline)
    .map(([date, events]) => ({
      date: formatDate(date),
      fullDate: date,
      count: events.length,
      market: events.filter(e => e.type === "market_warnings").length,
      credit: events.filter(e => e.type === "credit_risk").length,
      global: events.filter(e => e.type === "global_risks").length,
      regulatory: events.filter(e => e.type === "regulatory_risks").length,
    }))
    .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

  const maxTimelineCount = Math.max(...riskTimelineData.map(d => d.count), 1);

  /* --- Anomaly sections --- */
  const anomalySections = [
    {
      title: "Unusual Market Days",
      subtitle: `Sensex moves > ${anomalies.unusual_market_threshold?.toFixed(0) ?? "2"}σ`,
      icon: <TrendingDown size={16} className="text-red-400" />,
      items: anomalies.unusual_market_days_gt2std.map(d => ({
        date: d.date,
        magnitude: `${d.change >= 0 ? "+" : ""}${d.change.toFixed(0)} pts`,
        z_score: d.z_score,
        isPositive: d.change >= 0,
      })),
      color: "#ef4444",
    },
    {
      title: "Unusual Gold Moves",
      subtitle: "Statistically significant gold price changes",
      icon: <Zap size={16} className="text-amber-400" />,
      items: anomalies.unusual_gold_moves.map(d => ({
        date: d.date,
        magnitude: `${d.change >= 0 ? "+" : ""}Rs ${Math.abs(d.change).toFixed(0)}/10g`,
        z_score: d.z_score,
        isPositive: d.change >= 0,
      })),
      color: "#f5a623",
    },
    {
      title: "Unusual Silver Moves",
      subtitle: "Statistically significant silver price changes",
      icon: <Zap size={16} className="text-zinc-400" />,
      items: anomalies.unusual_silver_moves.map(d => ({
        date: d.date,
        magnitude: `${d.change >= 0 ? "+" : ""}Rs ${Math.abs(d.change).toFixed(0)}/kg`,
        z_score: d.z_score,
        isPositive: d.change >= 0,
      })),
      color: "#94a3b8",
    },
    {
      title: "News Volume Anomalies",
      subtitle: "Days with abnormal article counts",
      icon: <Activity size={16} className="text-blue-400" />,
      items: anomalies.news_volume_anomalies.map(d => ({
        date: d.date,
        magnitude: `${d.count} articles`,
        z_score: d.z_score,
        isPositive: true,
      })),
      color: "#3b82f6",
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-red-400">Risk</span>{" "}
          <span className="text-[#e4e4e7]">& Anomalies</span>
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          {totalRiskArticles} risk signals detected &middot; {anomalies.unusual_market_days_gt2std.length} market anomalies &middot; January 2026
        </p>
      </motion.div>

      {/* ===================== SECTION 1: Risk Overview Cards ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {riskCategories.map(({ key, data: rd }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 hover:border-[#2e2e3e] transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${RISK_COLORS[key]}20` }}
                >
                  <span style={{ color: RISK_COLORS[key] }}>{RISK_ICONS[key]}</span>
                </div>
                <span className="text-[#a1a1aa] text-xs font-medium">{RISK_LABELS[key]}</span>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-mono text-2xl font-bold text-[#e4e4e7]">{rd.count}</p>
                <p className="text-[10px] text-[#a1a1aa] mt-0.5">articles</p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm font-semibold ${sentimentColorClass(rd.avg_sentiment)}`}>
                  {rd.avg_sentiment.toFixed(2)}
                </p>
                <p className={`text-[10px] ${sentimentColorClass(rd.avg_sentiment)}`}>
                  {sentimentLabel(rd.avg_sentiment)}
                </p>
              </div>
            </div>
            {/* Mini bar showing proportion of total */}
            <div className="mt-3 w-full bg-[#1e1e2e] rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${totalRiskArticles > 0 ? (rd.count / totalRiskArticles) * 100 : 0}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 + 0.3 }}
                className="h-full rounded-full"
                style={{ backgroundColor: RISK_COLORS[key] }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ===================== SECTION 2: Risk Timeline ===================== */}
      <ChartCard
        title="Risk Timeline"
        subtitle="Daily risk signal count by category"
        action={
          <div className="flex items-center gap-3">
            {Object.entries(RISK_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS[key] }} />
                <span className="text-[10px] text-[#a1a1aa]">{label}</span>
              </div>
            ))}
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={riskTimelineData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              {Object.entries(RISK_COLORS).map(([key, color]) => (
                <linearGradient key={key} id={`risk-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              allowDecimals={false}
              domain={[0, Math.ceil(maxTimelineCount * 1.1)]}
            />
            <Tooltip content={<RiskTooltip />} />
            <Bar dataKey="market" name="Market Warnings" stackId="risk" fill="url(#risk-market_warnings)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="credit" name="Credit Risk" stackId="risk" fill="url(#risk-credit_risk)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="global" name="Global Risks" stackId="risk" fill="url(#risk-global_risks)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="regulatory" name="Regulatory Risks" stackId="risk" fill="url(#risk-regulatory_risks)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ===================== SECTION 3: Highest Risk Days ===================== */}
      <ChartCard
        title="Highest Risk Days"
        subtitle={`Top ${risk_signals.highest_risk_days.length} days ranked by risk event count`}
      >
        <div className="space-y-2">
          {risk_signals.highest_risk_days.map((day, i) => {
            const maxCount = risk_signals.highest_risk_days[0]?.risk_count ?? 1;
            const pct = (day.risk_count / maxCount) * 100;
            const timelineEvents = risk_signals.risk_timeline[day.date] ?? [];

            // Count by type for this day
            const typeCounts: Record<string, number> = {};
            timelineEvents.forEach(e => {
              typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;
            });

            return (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="bg-[#0a0a0f]/60 border border-[#1e1e2e]/50 rounded-lg p-3.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#f5a623] w-6 text-right">
                      #{i + 1}
                    </span>
                    <span className="text-sm text-[#e4e4e7] font-medium">
                      {formatDateFull(day.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Type breakdown pills */}
                    <div className="flex items-center gap-1.5">
                      {Object.entries(typeCounts).map(([type, count]) => (
                        <span
                          key={type}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${RISK_COLORS[type] ?? "#a1a1aa"}20`,
                            color: RISK_COLORS[type] ?? "#a1a1aa",
                          }}
                        >
                          {count}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-sm font-bold text-red-400">
                      {day.risk_count} events
                    </span>
                  </div>
                </div>
                {/* Bar */}
                <div className="w-full bg-[#1e1e2e] rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500"
                  />
                </div>
                {/* Headlines preview */}
                {timelineEvents.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {timelineEvents.slice(0, 3).map((evt, j) => (
                      <span
                        key={j}
                        className="text-[10px] text-[#a1a1aa] bg-[#1e1e2e]/80 px-2 py-0.5 rounded truncate max-w-[250px]"
                        title={evt.headline}
                      >
                        {evt.headline}
                      </span>
                    ))}
                    {timelineEvents.length > 3 && (
                      <span className="text-[10px] text-[#a1a1aa]/60 px-2 py-0.5">
                        +{timelineEvents.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </ChartCard>

      {/* ===================== SECTION 4: Anomaly Detection ===================== */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-2 mb-1"
      >
        <h2 className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-400" />
          Statistical Anomalies
        </h2>
        <p className="text-xs text-[#a1a1aa] mt-0.5">
          Events exceeding normal distribution thresholds (z-score based)
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {anomalySections.map((section, sIdx) => (
          <ChartCard
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
            action={
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0a0a0f]/60">
                {section.icon}
                <span className="text-xs font-mono text-[#a1a1aa]">
                  {section.items.length}
                </span>
              </div>
            }
          >
            {section.items.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#a1a1aa]/50">
                No anomalies detected in this category
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {section.items.map((item, i) => (
                  <motion.div
                    key={item.date}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                    className={`border rounded-lg p-3 ${zScoreBg(item.z_score)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#e4e4e7] font-medium">
                          {formatDateFull(item.date)}
                        </span>
                        <span
                          className={`font-mono text-sm font-bold ${
                            item.isPositive ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {item.magnitude}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#a1a1aa]">z-score</span>
                        <span className={`font-mono text-sm font-bold ${zScoreColor(item.z_score)}`}>
                          {item.z_score >= 0 ? "+" : ""}{item.z_score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* z-score magnitude bar */}
                    <div className="mt-2 w-full bg-[#0a0a0f]/60 rounded-full h-1 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.min(Math.abs(item.z_score) / 4 * 100, 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.04 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: section.color }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ChartCard>
        ))}
      </div>

      {/* ===================== Anomaly Overview Chart ===================== */}
      {anomalies.unusual_market_days_gt2std.length > 0 && (
        <ChartCard
          title="Market Anomaly Distribution"
          subtitle="Sensex moves beyond normal distribution thresholds"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={anomalies.unusual_market_days_gt2std
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(d => ({
                  date: formatDate(d.date),
                  change: d.change,
                  z_score: d.z_score,
                  fill: d.change >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative,
                }))}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
                      <p className="text-xs text-[#a1a1aa] mb-1">{label}</p>
                      <p
                        className="text-sm font-mono font-medium"
                        style={{ color: d?.change >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative }}
                      >
                        Change: {d?.change >= 0 ? "+" : ""}{d?.change?.toFixed(0)} pts
                      </p>
                      <p className="text-sm font-mono text-amber-400">
                        Z-Score: {d?.z_score?.toFixed(2)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="change"
                name="Sensex Change (pts)"
                radius={[3, 3, 0, 0]}
                fill={CHART_COLORS.negative}
              >
                {anomalies.unusual_market_days_gt2std
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.change >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative}
                    />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Risk & Anomaly Analysis &middot; Data Source: Amar Ujala Karobar Section &middot; January 2026
      </div>
    </div>
  );
}
