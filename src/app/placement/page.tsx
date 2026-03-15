"use client";

import { useDataContext } from "@/lib/data";
import { categoryLabel, formatDate, sentimentColor, sentimentBg, impactBg } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import {
  Star, Layout, AlignLeft, PanelRight, Calendar, AlertTriangle,
  CheckCircle2, TrendingDown, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";

/* ---------- Constants ---------- */

const SIZE_COLORS: Record<string, string> = {
  lead: "#f5a623",
  secondary: "#3b82f6",
  brief: "#8b5cf6",
  sidebar: "#22c55e",
  data_box: "#ef4444",
  column: "#a1a1aa",
};

const SIZE_ORDER = ["lead", "secondary", "brief", "sidebar", "data_box", "column"];

const IMPACT_BG: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-blue-500/20 text-blue-400",
};

const PLACEMENT_META: Record<string, { icon: typeof Star; label: string; color: string }> = {
  lead: { icon: Star, label: "Lead", color: "#f5a623" },
  secondary: { icon: Layout, label: "Secondary", color: "#3b82f6" },
  brief: { icon: AlignLeft, label: "Brief", color: "#8b5cf6" },
  sidebar: { icon: PanelRight, label: "Sidebar", color: "#22c55e" },
};

/* ---------- Tooltip ---------- */

function PlacementTooltip({ active, payload, label }: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-[#a1a1aa] mb-1">{label}</p>
      {payload.filter((p) => p.value > 0).map((p, i) => (
        <p key={i} className="text-sm font-mono font-medium" style={{ color: p.color || p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function PlacementPage() {
  const { data, loading, error } = useDataContext();
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [leadListExpanded, setLeadListExpanded] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const articles = data?.articles ?? [];

  /* ---------- Computed Data ---------- */

  const sizeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach((a) => {
      counts[a.article_size] = (counts[a.article_size] || 0) + 1;
    });
    return counts;
  }, [articles]);

  const total = articles.length;

  // Section 2: Placement x Category stacked bar
  const categoryStackedData = useMemo(() => {
    const catSizeMap: Record<string, Record<string, number>> = {};
    articles.forEach((a) => {
      if (!catSizeMap[a.category]) catSizeMap[a.category] = {};
      catSizeMap[a.category][a.article_size] = (catSizeMap[a.category][a.article_size] || 0) + 1;
    });
    return Object.entries(catSizeMap)
      .map(([cat, sizes]) => ({
        category: categoryLabel(cat),
        raw: cat,
        lead: sizes.lead || 0,
        secondary: sizes.secondary || 0,
        brief: sizes.brief || 0,
        sidebar: sizes.sidebar || 0,
        data_box: sizes.data_box || 0,
        column: sizes.column || 0,
        total: Object.values(sizes).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.lead - a.lead || b.total - a.total);
  }, [articles]);

  // Section 3: Placement x Impact matrix
  const impactMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    const sizes = ["lead", "secondary", "brief", "sidebar"];
    const impacts = ["high", "medium", "low"];

    sizes.forEach((s) => {
      matrix[s] = {};
      impacts.forEach((imp) => { matrix[s][imp] = 0; });
    });

    articles.forEach((a) => {
      const size = a.article_size;
      const impact = a.impact_level;
      if (matrix[size]) {
        matrix[size][impact] = (matrix[size][impact] || 0) + 1;
      }
    });

    // Alignment score: % of high-impact stories that got lead/secondary
    const highImpactTotal = articles.filter((a) => a.impact_level === "high").length;
    const highImpactProminent = articles.filter(
      (a) => a.impact_level === "high" && (a.article_size === "lead" || a.article_size === "secondary")
    ).length;
    const alignmentScore = highImpactTotal > 0 ? ((highImpactProminent / highImpactTotal) * 100) : 0;

    // Misalignment counts
    const highBuried = articles.filter(
      (a) => a.impact_level === "high" && (a.article_size === "brief" || a.article_size === "sidebar")
    ).length;
    const lowPromoted = articles.filter(
      (a) => a.impact_level === "low" && a.article_size === "lead"
    ).length;

    return { matrix, alignmentScore, highBuried, lowPromoted, highImpactTotal };
  }, [articles]);

  // Section 4: Lead Story Calendar
  const calendarData = useMemo(() => {
    const dayMap: Record<string, { date: string; leads: { headline: string; category: string }[] }> = {};
    articles
      .filter((a) => a.article_size === "lead")
      .forEach((a) => {
        if (!dayMap[a.date]) dayMap[a.date] = { date: a.date, leads: [] };
        dayMap[a.date].leads.push({ headline: a.headline, category: a.category });
      });
    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [articles]);

  // Section 5: Lead stories list
  const leadStories = useMemo(() => {
    return articles
      .filter((a) => a.article_size === "lead")
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [articles]);

  // Section 6: Sidebar analysis
  const sidebarAnalysis = useMemo(() => {
    const sidebarArticles = articles.filter((a) => a.article_size === "sidebar");
    const catCounts: Record<string, number> = {};
    sidebarArticles.forEach((a) => {
      catCounts[a.category] = (catCounts[a.category] || 0) + 1;
    });
    const byCat = Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, count]) => ({ category: categoryLabel(cat), raw: cat, count }));

    const highImpactSidebars = sidebarArticles.filter((a) => a.impact_level === "high");

    return { total: sidebarArticles.length, byCat, highImpactSidebars };
  }, [articles]);

  /* ---------- Loading / Error ---------- */

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return <div className="p-8 text-red-400">Error: {error}</div>;

  const primarySizes = ["lead", "secondary", "brief", "sidebar"] as const;

  const LEAD_LIST_LIMIT = 15;
  const SIDEBAR_LIST_LIMIT = 10;
  const CALENDAR_LIMIT = 10;

  const visibleLeads = leadListExpanded ? leadStories : leadStories.slice(0, LEAD_LIST_LIMIT);
  const visibleSidebarHigh = sidebarExpanded
    ? sidebarAnalysis.highImpactSidebars
    : sidebarAnalysis.highImpactSidebars.slice(0, SIDEBAR_LIST_LIMIT);
  const visibleCalendar = calendarExpanded ? calendarData : calendarData.slice(0, CALENDAR_LIMIT);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-[#f5a623]">Story</span>{" "}
          <span className="text-[#e4e4e7]">Placement</span>
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          How stories are positioned across {total} articles &middot; January 2026
        </p>
      </motion.div>

      {/* ====== 1. Placement Overview — 4 Stat Cards ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {primarySizes.map((size, i) => {
          const meta = PLACEMENT_META[size];
          const count = sizeCounts[size] || 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
          const Icon = meta.icon;

          return (
            <motion.div
              key={size}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 relative overflow-hidden"
            >
              <div
                className="absolute bottom-0 left-0 h-1 rounded-b-xl transition-all"
                style={{
                  backgroundColor: meta.color,
                  width: total > 0 ? `${(count / total) * 100}%` : "0%",
                }}
              />
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} style={{ color: meta.color }} />
                <span className="text-xs text-[#a1a1aa]">{meta.label}</span>
              </div>
              <p className="text-2xl font-bold text-[#e4e4e7] font-mono">{count}</p>
              <p className="text-xs text-[#a1a1aa] mt-1">{pct}% of total</p>
            </motion.div>
          );
        })}
      </div>

      {/* ====== 2. Placement x Category — Stacked Horizontal Bar ====== */}
      <ChartCard
        title="Placement by Category"
        subtitle="Which categories get the most lead stories? Sorted by lead count descending."
      >
        <ResponsiveContainer width="100%" height={Math.max(320, categoryStackedData.length * 36)}>
          <BarChart
            data={categoryStackedData}
            layout="vertical"
            margin={{ top: 5, right: 30, bottom: 5, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="category"
              width={140}
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
            />
            <Tooltip content={<PlacementTooltip />} />
            <Legend
              formatter={(value: string) => (
                <span className="text-xs text-[#a1a1aa] capitalize">{value.replace("_", " ")}</span>
              )}
            />
            {SIZE_ORDER.map((size) => (
              <Bar
                key={size}
                dataKey={size}
                name={size.charAt(0).toUpperCase() + size.slice(1).replace("_", " ")}
                stackId="placement"
                fill={SIZE_COLORS[size]}
                radius={
                  size === SIZE_ORDER[SIZE_ORDER.length - 1]
                    ? [0, 3, 3, 0]
                    : size === SIZE_ORDER[0]
                    ? [3, 0, 0, 3]
                    : undefined
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ====== 3. Placement x Impact Alignment Matrix ====== */}
      <ChartCard
        title="Placement-Impact Alignment"
        subtitle="Are high-impact stories getting the prominence they deserve?"
      >
        {/* Alignment Score */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-4 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-center"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CheckCircle2 size={14} className="text-green-400" />
              <span className="text-[10px] text-[#52525b] uppercase tracking-wider">Alignment Score</span>
            </div>
            <p className={`font-mono text-2xl font-bold ${
              impactMatrix.alignmentScore >= 70
                ? "text-green-400"
                : impactMatrix.alignmentScore >= 50
                ? "text-amber-400"
                : "text-red-400"
            }`}>
              {impactMatrix.alignmentScore.toFixed(0)}%
            </p>
            <p className="text-[10px] text-[#a1a1aa] mt-1">
              of high-impact stories got lead/secondary
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-center"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingDown size={14} className="text-orange-400" />
              <span className="text-[10px] text-[#52525b] uppercase tracking-wider">Buried High-Impact</span>
            </div>
            <p className="font-mono text-2xl font-bold text-orange-400">
              {impactMatrix.highBuried}
            </p>
            <p className="text-[10px] text-[#a1a1aa] mt-1">
              high-impact stories as brief/sidebar
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-center"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-[10px] text-[#52525b] uppercase tracking-wider">Over-Promoted Low</span>
            </div>
            <p className="font-mono text-2xl font-bold text-amber-400">
              {impactMatrix.lowPromoted}
            </p>
            <p className="text-[10px] text-[#a1a1aa] mt-1">
              low-impact stories got lead placement
            </p>
          </motion.div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e2e]">
                <th className="text-left py-2.5 px-3 text-[10px] text-[#52525b] uppercase tracking-wider font-medium">
                  Placement
                </th>
                {(["high", "medium", "low"] as const).map((imp) => (
                  <th key={imp} className="text-center py-2.5 px-3 text-[10px] text-[#52525b] uppercase tracking-wider font-medium">
                    {imp.charAt(0).toUpperCase() + imp.slice(1)} Impact
                  </th>
                ))}
                <th className="text-center py-2.5 px-3 text-[10px] text-[#52525b] uppercase tracking-wider font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {(["lead", "secondary", "brief", "sidebar"] as const).map((size) => {
                const row = impactMatrix.matrix[size];
                const rowTotal = (row?.high || 0) + (row?.medium || 0) + (row?.low || 0);
                return (
                  <tr key={size} className="border-b border-[#1e1e2e]/50 hover:bg-[#1e1e2e]/20 transition-colors">
                    <td className="py-3 px-3">
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium capitalize"
                        style={{
                          backgroundColor: `${SIZE_COLORS[size]}20`,
                          color: SIZE_COLORS[size],
                        }}
                      >
                        {size.replace("_", " ")}
                      </span>
                    </td>
                    {(["high", "medium", "low"] as const).map((imp) => {
                      const count = row?.[imp] || 0;
                      // Misalignment: high-impact in brief/sidebar, or low-impact as lead
                      const isMissedOpportunity = imp === "high" && (size === "brief" || size === "sidebar");
                      const isOverPromoted = imp === "low" && size === "lead";
                      const cellBg = isMissedOpportunity && count > 0
                        ? "bg-orange-500/15"
                        : isOverPromoted && count > 0
                        ? "bg-red-500/15"
                        : "";
                      const cellText = isMissedOpportunity && count > 0
                        ? "text-orange-400"
                        : isOverPromoted && count > 0
                        ? "text-red-400"
                        : "text-[#e4e4e7]";

                      return (
                        <td key={imp} className={`py-3 px-3 text-center ${cellBg} transition-colors`}>
                          <span className={`font-mono font-medium text-sm ${cellText}`}>
                            {count}
                          </span>
                          {isMissedOpportunity && count > 0 && (
                            <span className="block text-[9px] text-orange-400/80 mt-0.5">missed</span>
                          )}
                          {isOverPromoted && count > 0 && (
                            <span className="block text-[9px] text-red-400/80 mt-0.5">over-promoted</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-center font-mono text-sm text-[#a1a1aa]">
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-[#a1a1aa] mt-3">
          <span className="text-orange-400">Orange cells</span> = high-impact stories buried as briefs/sidebars (missed opportunities).{" "}
          <span className="text-red-400">Red cells</span> = low-impact stories given lead placement (possible over-promotion).
        </p>
      </ChartCard>

      {/* ====== 4. Lead Story Calendar ====== */}
      <ChartCard
        title="Lead Story Calendar"
        subtitle={`${calendarData.length} days with lead stories &middot; ${leadStories.length} total leads`}
        action={
          <div className="flex items-center gap-1 text-[#a1a1aa]">
            <Calendar size={14} />
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {visibleCalendar.map((day, i) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.02 }}
              className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3 hover:border-[#f5a623]/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-[#f5a623] font-medium">
                  {formatDate(day.date)}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f5a623]/10 text-[#f5a623] font-mono">
                  {day.leads.length} {day.leads.length === 1 ? "lead" : "leads"}
                </span>
              </div>
              <div className="space-y-1.5">
                {day.leads.map((lead, j) => (
                  <div key={j}>
                    <p className="text-xs text-[#e4e4e7] line-clamp-2 leading-relaxed">
                      {lead.headline}
                    </p>
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] mt-1">
                      {categoryLabel(lead.category)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {calendarData.length > CALENDAR_LIMIT && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setCalendarExpanded(!calendarExpanded)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg border border-[#1e1e2e] text-[#a1a1aa] hover:bg-[#1e1e2e] hover:text-[#e4e4e7] transition-colors"
            >
              {calendarExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {calendarExpanded
                ? "Show fewer"
                : `Show all ${calendarData.length} days`}
            </button>
          </div>
        )}
      </ChartCard>

      {/* ====== 5. Lead Story Analysis ====== */}
      <ChartCard
        title="Lead Story Analysis"
        subtitle={`All ${leadStories.length} lead stories — the front page decisions`}
        action={
          <div className="flex items-center gap-1">
            <Star size={14} className="text-[#f5a623]" />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e2e]">
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium">Date</th>
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium">Headline</th>
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium hidden md:table-cell">Category</th>
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium hidden sm:table-cell">Impact</th>
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((article, idx) => (
                <tr
                  key={`lead-${article.date}-${idx}`}
                  className="border-b border-[#1e1e2e]/50 hover:bg-[#1e1e2e]/20 transition-colors"
                >
                  <td className="py-2.5 px-2 text-[#a1a1aa] text-xs whitespace-nowrap font-mono">
                    {formatDate(article.date)}
                  </td>
                  <td className="py-2.5 px-2 text-[#e4e4e7] max-w-[400px]">
                    <span className="line-clamp-2 text-xs leading-relaxed">{article.headline}</span>
                  </td>
                  <td className="py-2.5 px-2 hidden md:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] whitespace-nowrap">
                      {categoryLabel(article.category)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${impactBg(article.impact_level)} whitespace-nowrap capitalize`}>
                      {article.impact_level}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sentimentBg(article.sentiment)} whitespace-nowrap`}>
                        {article.sentiment}
                      </span>
                      <span className="text-[10px] font-mono hidden lg:inline" style={{ color: sentimentColor(article.sentiment) }}>
                        {article.sentiment_score.toFixed(2)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leadStories.length > LEAD_LIST_LIMIT && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setLeadListExpanded(!leadListExpanded)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg border border-[#1e1e2e] text-[#a1a1aa] hover:bg-[#1e1e2e] hover:text-[#e4e4e7] transition-colors"
            >
              {leadListExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {leadListExpanded
                ? "Show fewer"
                : `Show all ${leadStories.length} lead stories`}
            </button>
          </div>
        )}

        {leadStories.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#52525b] text-sm">No lead stories found.</p>
          </div>
        )}
      </ChartCard>

      {/* ====== 6. Sidebar Stories Analysis ====== */}
      <ChartCard
        title="Sidebar Stories Analysis"
        subtitle={`${sidebarAnalysis.total} sidebar stories — the largest placement group`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Sidebar category breakdown */}
          <div>
            <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-3">Categories Dominating Sidebars</p>
            <div className="space-y-2">
              {sidebarAnalysis.byCat.map((cat, i) => {
                const pct = sidebarAnalysis.total > 0
                  ? ((cat.count / sidebarAnalysis.total) * 100)
                  : 0;
                return (
                  <motion.div
                    key={cat.raw}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#e4e4e7]">{cat.category}</span>
                      <span className="font-mono text-[#a1a1aa]">{cat.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#0a0a0f] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: SIZE_COLORS.sidebar }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* High-impact stories buried as sidebars */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-orange-400" />
              <p className="text-[10px] text-[#52525b] uppercase tracking-wider">
                High-Impact Stories Buried as Sidebars ({sidebarAnalysis.highImpactSidebars.length})
              </p>
            </div>

            {sidebarAnalysis.highImpactSidebars.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-center">
                <CheckCircle2 size={20} className="text-green-400 mx-auto mb-2" />
                <p className="text-xs text-[#a1a1aa]">No high-impact stories were buried as sidebars.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {visibleSidebarHigh.map((article, idx) => (
                    <motion.div
                      key={`sidebar-high-${idx}`}
                      initial={{ opacity: 0, y: 5 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.02 }}
                      className="p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[#a1a1aa]">{formatDate(article.date)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3b82f6]/10 text-[#3b82f6]">
                          {categoryLabel(article.category)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${IMPACT_BG.high}`}>
                          high
                        </span>
                      </div>
                      <p className="text-xs text-[#e4e4e7] line-clamp-2 leading-relaxed">{article.headline}</p>
                    </motion.div>
                  ))}
                </div>

                {sidebarAnalysis.highImpactSidebars.length > SIDEBAR_LIST_LIMIT && (
                  <div className="flex justify-center pt-3">
                    <button
                      onClick={() => setSidebarExpanded(!sidebarExpanded)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#1e1e2e] text-[#a1a1aa] hover:bg-[#1e1e2e] hover:text-[#e4e4e7] transition-colors"
                    >
                      {sidebarExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {sidebarExpanded
                        ? "Show fewer"
                        : `Show all ${sidebarAnalysis.highImpactSidebars.length}`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </ChartCard>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Data Source: Amar Ujala Karobar Section &middot; January 2026 &middot; {total} Articles Analyzed
      </div>
    </div>
  );
}
