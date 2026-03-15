"use client";

import { useDataContext } from "@/lib/data";
import { formatINR, formatPercent, CHART_COLORS, formatDate } from "@/lib/utils";
import KpiCard from "@/components/ui/KpiCard";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Area, AreaChart,
} from "recharts";
import {
  Newspaper, TrendingUp, TrendingDown, CircleDollarSign, Gem,
  ArrowDownUp, Users, Scale, FileText, Layers, Lightbulb, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-[#a1a1aa] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-mono font-medium" style={{ color: p.color }}>
          {p.name}: {formatINR(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { data, loading, error } = useDataContext();
  const [showIndex, setShowIndex] = useState<"both" | "sensex" | "nifty">("both");
  const [expandedSummary, setExpandedSummary] = useState(false);

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return <div className="p-8 text-red-400">Error: {error}</div>;

  const { kpi_cards, time_series } = data.dashboard_charts;

  const kpis = [
    { label: "Sensex Return", value: formatPercent(kpi_cards.sensex_period_return), color: "red" as const, icon: <TrendingDown size={16} /> },
    { label: "Gold Return", value: formatPercent(kpi_cards.gold_period_return), color: "green" as const, icon: <CircleDollarSign size={16} /> },
    { label: "Silver Return", value: formatPercent(kpi_cards.silver_period_return), color: "green" as const, icon: <Gem size={16} /> },
    { label: "Rupee Change", value: `+${kpi_cards.rupee_period_change.toFixed(2)}`, color: "red" as const, icon: <ArrowDownUp size={16} /> },
    { label: "Net FII Flow", value: `-Rs ${formatINR(Math.abs(kpi_cards.net_fii_flow))} Cr`, color: "red" as const, icon: <Users size={16} /> },
    { label: "Net DII Flow", value: `+Rs ${formatINR(kpi_cards.net_dii_flow)} Cr`, color: "green" as const, icon: <Users size={16} /> },
    { label: "Sentiment", value: `${kpi_cards.overall_sentiment_score.toFixed(2)} (Mildly +ve)`, color: "green" as const, icon: <Scale size={16} /> },
    { label: "Total Articles", value: String(kpi_cards.total_articles), color: "neutral" as const, icon: <Newspaper size={16} /> },
    { label: "Avg Daily", value: String(kpi_cards.avg_daily_articles), color: "neutral" as const, icon: <FileText size={16} /> },
    { label: "Policy Changes", value: String(kpi_cards.policy_changes_count), color: "gold" as const, icon: <Layers size={16} /> },
    { label: "IPOs Tracked", value: String(kpi_cards.ipos_tracked), color: "neutral" as const, icon: <TrendingUp size={16} /> },
    { label: "Top Sector", value: kpi_cards.most_covered_sector, color: "gold" as const, icon: <Lightbulb size={16} /> },
  ];

  // Merge sensex and nifty for dual chart
  const marketData = time_series.sensex_daily.map((s, i) => ({
    date: formatDate(s.date),
    Sensex: s.value,
    Nifty: time_series.nifty_daily[i]?.value,
  }));

  // Gold and Silver data
  const metalData = time_series.gold_daily.map((g, i) => ({
    date: formatDate(g.date),
    Gold: g.value,
    Silver: time_series.silver_daily[i]?.value,
  }));

  // FII vs DII
  const flowData: { date: string; FII: number; DII: number }[] = [];
  const fiiMap = new Map(time_series.fii_daily.map((f) => [f.date, f.value]));
  const diiMap = new Map(time_series.dii_daily.map((d) => [d.date, d.value]));
  const allFlowDates = [...new Set([...time_series.fii_daily.map((f) => f.date), ...time_series.dii_daily.map((d) => d.date)])].sort();
  allFlowDates.forEach((date) => {
    flowData.push({ date: formatDate(date), FII: fiiMap.get(date) ?? 0, DII: diiMap.get(date) ?? 0 });
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-[#f5a623]">Karobar</span>{" "}
          <span className="text-[#e4e4e7]">Intelligence</span>
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          January 2026 &middot; Amar Ujala Business Section &middot; {data.metadata.total_pdfs_processed} Pages &middot; {data.metadata.total_articles_extracted} Articles
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-6 lg:gap-3">
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} delay={i * 0.05} />
        ))}
      </div>

      {/* Market Overview Chart */}
      <ChartCard
        title="Market Overview"
        subtitle="BSE Sensex & NSE Nifty — January 2026"
        action={
          <div className="flex gap-1">
            {(["both", "sensex", "nifty"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setShowIndex(opt)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  showIndex === opt ? "bg-[#f5a623]/20 text-[#f5a623]" : "text-[#a1a1aa] hover:bg-[#1e1e2e]"
                }`}
              >
                {opt === "both" ? "Both" : opt === "sensex" ? "Sensex" : "Nifty"}
              </button>
            ))}
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={marketData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="sensexGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.sensex} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.sensex} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="niftyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.nifty} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.nifty} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <YAxis yAxisId="sensex" domain={["auto", "auto"]} tick={{ fill: "#a1a1aa", fontSize: 11 }} hide={showIndex === "nifty"} />
            <YAxis yAxisId="nifty" orientation="right" domain={["auto", "auto"]} tick={{ fill: "#a1a1aa", fontSize: 11 }} hide={showIndex === "sensex"} />
            <Tooltip content={<CustomTooltip />} />
            {showIndex !== "nifty" && (
              <Area yAxisId="sensex" type="monotone" dataKey="Sensex" stroke={CHART_COLORS.sensex} fill="url(#sensexGrad)" strokeWidth={2} dot={false} />
            )}
            {showIndex !== "sensex" && (
              <Area yAxisId="nifty" type="monotone" dataKey="Nifty" stroke={CHART_COLORS.nifty} fill="url(#niftyGrad)" strokeWidth={2} dot={false} />
            )}
            <Legend />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Two Column: Gold/Silver + FII/DII */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Gold & Silver" subtitle="Price trends — January 2026">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={metalData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis yAxisId="gold" domain={["auto", "auto"]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis yAxisId="silver" orientation="right" domain={["auto", "auto"]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line yAxisId="gold" type="monotone" dataKey="Gold" stroke={CHART_COLORS.gold} strokeWidth={2} dot={false} />
              <Line yAxisId="silver" type="monotone" dataKey="Silver" stroke={CHART_COLORS.silver} strokeWidth={2} dot={false} />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="FII vs DII Flows" subtitle="Institutional activity (Rs Cr)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={flowData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="FII" fill={CHART_COLORS.fii} radius={[2, 2, 0, 0]} />
              <Bar dataKey="DII" fill={CHART_COLORS.dii} radius={[2, 2, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Key Insights */}
      <ChartCard title="Key Insights" subtitle={`${data.key_insights.length} findings from January 2026`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.key_insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              className="flex gap-3 p-3 rounded-lg bg-[#0a0a0f]/60 border border-[#1e1e2e]/50"
            >
              <span className="text-[#f5a623] font-mono text-xs font-bold mt-0.5 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-sm text-[#e4e4e7]/90 leading-relaxed">{insight}</p>
            </motion.div>
          ))}
        </div>
      </ChartCard>

      {/* Narrative Summary */}
      <ChartCard title="Executive Summary">
        <div>
          <AnimatePresence>
            <motion.div
              className={`text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-line ${!expandedSummary ? "line-clamp-4" : ""}`}
            >
              {data.narrative_summary}
            </motion.div>
          </AnimatePresence>
          <button
            onClick={() => setExpandedSummary(!expandedSummary)}
            className="flex items-center gap-1 mt-3 text-xs text-[#f5a623] hover:text-[#f5a623]/80 transition-colors"
          >
            {expandedSummary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expandedSummary ? "Show less" : "Read full summary"}
          </button>
        </div>
      </ChartCard>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Data Source: Amar Ujala Karobar Section &middot; January 2026 &middot; {data.metadata.total_articles_extracted} Articles from {data.metadata.total_pdfs_processed} Pages
      </div>
    </div>
  );
}
