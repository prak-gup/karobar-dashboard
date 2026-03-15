"use client";

import { useDataContext } from "@/lib/data";
import { categoryLabel, sentimentColor, CHART_COLORS } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Layers, Grid3X3, TrendingUp, Sparkles, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";

const PIE_COLORS = [
  "#3b82f6", "#8b5cf6", "#f5a623", "#22c55e", "#ef4444",
  "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#a855f7",
  "#14b8a6", "#f97316",
];

const ARTICLE_SIZES: { key: string; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "secondary", label: "Secondary" },
  { key: "brief", label: "Brief" },
  { key: "sidebar", label: "Sidebar" },
  { key: "data_box", label: "Data Box" },
  { key: "column", label: "Column" },
];

const SENTIMENT_TYPES = ["positive", "negative", "neutral", "mixed"] as const;

const SENTIMENT_BAR_COLORS: Record<string, string> = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#a1a1aa",
  mixed: "#f59e0b",
};

/* -------- Tooltip -------- */

function StandardTooltip({ active, payload, label }: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<any>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-[#a1a1aa] mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} className="text-sm font-mono font-medium" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value : p.value}
        </p>
      ))}
    </div>
  );
}

/* -------- Sentiment score to color (red-to-green gradient) -------- */

function sentimentGradientColor(avgScore: number): string {
  // avgScore ranges roughly -1 to 1, map to 0..1
  const ratio = Math.max(0, Math.min(1, (avgScore + 1) / 2));
  const r = Math.round(239 - ratio * (239 - 34));
  const g = Math.round(68 + ratio * (197 - 68));
  const b = Math.round(68 + ratio * (94 - 68));
  return `rgb(${r},${g},${b})`;
}

/* -------- Main Page -------- */

export default function ContentMixPage() {
  const { data, loading, error } = useDataContext();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  /* ---- Computed data ---- */

  const articles = data?.articles ?? [];
  const categoryByWeek = data?.dashboard_charts?.heatmaps?.category_by_week ?? {};

  // 1. Category breakdown: count + avg sentiment per category
  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; totalSentiment: number; sentiments: Record<string, number>; sizes: Record<string, number>; keywords: Record<string, number>; weeklyCounts: number[] }> = {};

    articles.forEach((a) => {
      if (!map[a.category]) {
        map[a.category] = { count: 0, totalSentiment: 0, sentiments: { positive: 0, negative: 0, neutral: 0, mixed: 0 }, sizes: {}, keywords: {}, weeklyCounts: [0, 0, 0, 0] };
      }
      const entry = map[a.category];
      entry.count++;
      entry.totalSentiment += a.sentiment_score;
      entry.sentiments[a.sentiment] = (entry.sentiments[a.sentiment] || 0) + 1;
      entry.sizes[a.article_size] = (entry.sizes[a.article_size] || 0) + 1;
      a.keywords.forEach((k) => {
        entry.keywords[k] = (entry.keywords[k] || 0) + 1;
      });
    });

    // Fill weekly counts from heatmap data
    Object.entries(categoryByWeek).forEach(([cat, weeks]) => {
      if (map[cat]) {
        map[cat].weeklyCounts = [
          weeks["week_1"] ?? 0,
          weeks["week_2"] ?? 0,
          weeks["week_3"] ?? 0,
          weeks["week_4"] ?? 0,
        ];
      }
    });

    return Object.entries(map)
      .map(([cat, stats]) => ({
        category: cat,
        label: categoryLabel(cat),
        count: stats.count,
        avgSentiment: stats.count > 0 ? stats.totalSentiment / stats.count : 0,
        sentiments: stats.sentiments,
        sizes: stats.sizes,
        keywords: Object.entries(stats.keywords).sort(([, a], [, b]) => b - a).slice(0, 3).map(([k]) => k),
        weeklyCounts: stats.weeklyCounts,
        topSize: Object.entries(stats.sizes).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "brief",
      }))
      .sort((a, b) => b.count - a.count);
  }, [articles, categoryByWeek]);

  const totalArticles = articles.length;

  // 1. Category breakdown bar chart data
  const categoryBarData = useMemo(() =>
    categoryStats.map((c) => ({
      name: c.label,
      count: c.count,
      avgSentiment: c.avgSentiment,
      fill: sentimentGradientColor(c.avgSentiment),
    })),
    [categoryStats]
  );

  // 2. Category x Size matrix data
  const sizeMatrixData = useMemo(() => {
    const maxCount = Math.max(
      1,
      ...categoryStats.flatMap((c) => ARTICLE_SIZES.map((s) => c.sizes[s.key] ?? 0))
    );
    return { categories: categoryStats, maxCount };
  }, [categoryStats]);

  // 3. Weekly category trends (top 8 categories)
  const weeklyTrendsData = useMemo(() => {
    const top8 = categoryStats.slice(0, 8);
    return ["Week 1", "Week 2", "Week 3", "Week 4"].map((weekLabel, weekIdx) => {
      const entry: Record<string, string | number> = { week: weekLabel };
      top8.forEach((cat) => {
        const weekKey = `week_${weekIdx + 1}`;
        entry[cat.label] = categoryByWeek[cat.category]?.[weekKey] ?? 0;
      });
      return entry;
    });
  }, [categoryStats, categoryByWeek]);

  const top8Labels = useMemo(() => categoryStats.slice(0, 8).map((c) => c.label), [categoryStats]);

  // 4. Category sentiment profile (stacked horizontal bar)
  const sentimentProfileData = useMemo(() =>
    categoryStats.map((c) => ({
      name: c.label,
      positive: c.sentiments.positive || 0,
      negative: c.sentiments.negative || 0,
      neutral: c.sentiments.neutral || 0,
      mixed: c.sentiments.mixed || 0,
    })),
    [categoryStats]
  );

  // 5. Deep dive cards (top 10)
  const deepDiveCards = useMemo(() => categoryStats.slice(0, 10), [categoryStats]);
  const maxWeeklyInCards = useMemo(
    () => Math.max(1, ...deepDiveCards.flatMap((c) => c.weeklyCounts)),
    [deepDiveCards]
  );

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return <div className="p-8 text-red-400">Error: {error}</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-[#f5a623]">Content</span>{" "}
          <span className="text-[#e4e4e7]">Mix</span>
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          What does the newsroom cover? &middot; {totalArticles} articles across {categoryStats.length} categories &middot; January 2026
        </p>
      </motion.div>

      {/* ====== 1. Category Breakdown ====== */}
      <ChartCard
        title="Category Breakdown"
        subtitle="All categories sorted by article count — bar color shows avg sentiment (red = negative, green = positive)"
        action={
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#ef4444]">Negative</span>
            <div className="w-16 h-1.5 rounded-full bg-gradient-to-r from-[#ef4444] via-[#f59e0b] to-[#22c55e]" />
            <span className="text-[10px] text-[#22c55e]">Positive</span>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={Math.max(400, categoryBarData.length * 28)}>
          <BarChart
            data={categoryBarData}
            layout="vertical"
            margin={{ top: 5, right: 60, bottom: 5, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { name: string; count: number; avgSentiment: number };
                return (
                  <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
                    <p className="text-sm text-[#e4e4e7] font-medium">{d.name}</p>
                    <p className="text-xs text-[#a1a1aa]">{d.count} articles</p>
                    <p className="text-xs font-mono" style={{ color: sentimentGradientColor(d.avgSentiment) }}>
                      Avg Sentiment: {d.avgSentiment.toFixed(3)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: "right", fill: "#a1a1aa", fontSize: 11 }}>
              {categoryBarData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ====== 2. Category x Article Size Matrix ====== */}
      <ChartCard
        title="Category x Article Size Matrix"
        subtitle="Which categories get front-page leads vs sidebars? Darker cells = higher count."
        action={
          <div className="flex items-center gap-1.5">
            <Grid3X3 size={14} className="text-[#a1a1aa]" />
            <span className="text-xs text-[#a1a1aa]">{categoryStats.length} x {ARTICLE_SIZES.length}</span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Column headers */}
            <div className="grid gap-px mb-px" style={{ gridTemplateColumns: `160px repeat(${ARTICLE_SIZES.length}, 1fr)` }}>
              <div className="py-2 px-2" />
              {ARTICLE_SIZES.map((size) => (
                <div
                  key={size.key}
                  className="py-2 px-1 text-center text-[10px] uppercase tracking-wider text-[#a1a1aa] font-medium"
                >
                  {size.label}
                </div>
              ))}
            </div>

            {/* Rows */}
            {sizeMatrixData.categories.map((cat, rowIdx) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: rowIdx * 0.02 }}
                className="grid gap-px mb-px"
                style={{ gridTemplateColumns: `160px repeat(${ARTICLE_SIZES.length}, 1fr)` }}
                onMouseEnter={() => setHoveredCategory(cat.category)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                {/* Row label */}
                <div
                  className={`py-2 px-2 text-xs truncate transition-colors ${
                    hoveredCategory === cat.category ? "text-[#f5a623]" : "text-[#a1a1aa]"
                  }`}
                >
                  {cat.label}
                  <span className="text-[#52525b] ml-1 font-mono">({cat.count})</span>
                </div>

                {/* Cells */}
                {ARTICLE_SIZES.map((size) => {
                  const count = cat.sizes[size.key] ?? 0;
                  const opacity = count > 0
                    ? Math.min(count / sizeMatrixData.maxCount, 1) * 0.8 + 0.1
                    : 0;

                  return (
                    <div
                      key={size.key}
                      className="py-2 px-1 text-center text-xs font-mono rounded-sm transition-all relative group"
                      style={{
                        backgroundColor: count > 0
                          ? `rgba(245, 166, 35, ${opacity})`
                          : "rgba(30, 30, 46, 0.3)",
                      }}
                    >
                      <span className={count > 0 ? "text-[#e4e4e7]" : "text-[#52525b]/50"}>
                        {count || "-"}
                      </span>
                      {/* Hover tooltip */}
                      {count > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                          <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded px-2 py-1 text-[10px] whitespace-nowrap shadow-xl">
                            {cat.label} / {size.label}: {count}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* ====== 3. Weekly Category Trends ====== */}
      <ChartCard
        title="Weekly Category Trends"
        subtitle="How editorial focus shifted week to week (top 8 categories)"
        action={
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-[#a1a1aa]" />
            <span className="text-xs text-[#a1a1aa]">4-week view</span>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={weeklyTrendsData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="week" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <Tooltip content={<StandardTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              formatter={(value: string) => <span className="text-[#a1a1aa]">{value}</span>}
            />
            {top8Labels.map((label, idx) => (
              <Bar
                key={label}
                dataKey={label}
                fill={PIE_COLORS[idx % PIE_COLORS.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ====== 4. Category Sentiment Profile ====== */}
      <ChartCard
        title="Category Sentiment Profile"
        subtitle="Editorial bias per topic — stacked by positive, negative, neutral, and mixed articles"
        action={
          <div className="flex items-center gap-3">
            {SENTIMENT_TYPES.map((s) => (
              <div key={s} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SENTIMENT_BAR_COLORS[s] }} />
                <span className="text-[10px] text-[#a1a1aa] capitalize">{s}</span>
              </div>
            ))}
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={Math.max(400, sentimentProfileData.length * 28)}>
          <BarChart
            data={sentimentProfileData}
            layout="vertical"
            margin={{ top: 5, right: 30, bottom: 5, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #2e2e3e", borderRadius: "8px" }}
              itemStyle={{ color: "#e4e4e7", fontSize: "12px" }}
              labelStyle={{ color: "#a1a1aa", fontSize: "11px" }}
            />
            <Bar dataKey="positive" stackId="sentiment" fill={SENTIMENT_BAR_COLORS.positive} name="Positive" radius={[0, 0, 0, 0]} />
            <Bar dataKey="neutral" stackId="sentiment" fill={SENTIMENT_BAR_COLORS.neutral} name="Neutral" />
            <Bar dataKey="mixed" stackId="sentiment" fill={SENTIMENT_BAR_COLORS.mixed} name="Mixed" />
            <Bar dataKey="negative" stackId="sentiment" fill={SENTIMENT_BAR_COLORS.negative} name="Negative" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ====== 5. Category Deep Dive Cards ====== */}
      <ChartCard
        title="Category Deep Dive"
        subtitle="Top 10 categories at a glance — keywords, placement patterns, and weekly rhythm"
        action={
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#f5a623]" />
            <span className="text-xs text-[#a1a1aa]">Top 10</span>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {deepDiveCards.map((cat, idx) => {
            const pct = totalArticles > 0 ? ((cat.count / totalArticles) * 100).toFixed(1) : "0";
            return (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.04 }}
                className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-4 hover:border-[#f5a623]/30 transition-colors"
              >
                {/* Category name + rank */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[#e4e4e7] font-semibold text-sm leading-tight">{cat.label}</p>
                    <p className="text-[10px] text-[#52525b] mt-0.5 font-mono">#{idx + 1} category</p>
                  </div>
                  <span
                    className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: sentimentGradientColor(cat.avgSentiment),
                      backgroundColor: `${sentimentGradientColor(cat.avgSentiment)}15`,
                    }}
                  >
                    {cat.avgSentiment >= 0 ? "+" : ""}{cat.avgSentiment.toFixed(2)}
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold text-[#e4e4e7] font-mono">{cat.count}</span>
                  <span className="text-xs text-[#a1a1aa]">articles</span>
                  <span className="text-xs text-[#52525b] ml-auto font-mono">{pct}%</span>
                </div>

                {/* Most common size */}
                <div className="mb-3">
                  <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1">Top Placement</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#f5a623]/10 text-[#f5a623] capitalize">
                    {cat.topSize.replace("_", " ")}
                  </span>
                </div>

                {/* Top keywords */}
                {cat.keywords.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1">Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {cat.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#3b82f6]/10 text-[#3b82f6] truncate max-w-[100px]"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mini weekly sparkline bars */}
                <div>
                  <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1.5">Weekly</p>
                  <div className="flex items-end gap-1 h-8">
                    {cat.weeklyCounts.map((wc, wi) => {
                      const barHeight = maxWeeklyInCards > 0 ? (wc / maxWeeklyInCards) * 100 : 0;
                      return (
                        <div key={wi} className="flex-1 flex flex-col items-center gap-0.5">
                          <div
                            className="w-full rounded-sm transition-all"
                            style={{
                              height: `${Math.max(barHeight, 4)}%`,
                              backgroundColor: wc > 0 ? PIE_COLORS[idx % PIE_COLORS.length] : "#1e1e2e",
                              opacity: wc > 0 ? 0.8 : 0.3,
                            }}
                          />
                          <span className="text-[8px] text-[#52525b] font-mono">{wc}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[7px] text-[#52525b]">W1</span>
                    <span className="text-[7px] text-[#52525b]">W4</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ChartCard>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Data Source: Amar Ujala Karobar Section &middot; January 2026 &middot; {totalArticles} Articles &middot; {categoryStats.length} Categories
      </div>
    </div>
  );
}
