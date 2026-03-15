"use client";

import { useDataContext } from "@/lib/data";
import { categoryLabel, sentimentColor } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Calendar, TrendingUp, Layers, BarChart3, Grid3X3 } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

/* ---------- Constants ---------- */

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEEK_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4"];

const SIZE_TYPES = ["lead", "secondary", "brief", "sidebar"] as const;
const SIZE_COLORS: Record<string, string> = {
  lead: "#f5a623",
  secondary: "#3b82f6",
  brief: "#8b5cf6",
  sidebar: "#22c55e",
};
const SIZE_LABELS: Record<string, string> = {
  lead: "Lead",
  secondary: "Secondary",
  brief: "Brief",
  sidebar: "Sidebar",
};

const SENTIMENT_TYPES = ["positive", "negative", "neutral", "mixed"] as const;

const CATEGORY_COLORS = [
  "#3b82f6", "#8b5cf6", "#f5a623", "#22c55e", "#ef4444",
  "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#a855f7",
];

/* ---------- Helpers ---------- */

function getWeekIndex(dateStr: string): number {
  const day = new Date(dateStr).getDate();
  if (day <= 7) return 0;
  if (day <= 14) return 1;
  if (day <= 21) return 2;
  return 3;
}

function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const jsDay = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  // Map to our DAY_NAMES (0=Mon ... 5=Sat). Sunday = -1 (skip)
  if (jsDay === 0) return ""; // Sunday — skip
  return DAY_NAMES[jsDay - 1];
}

/* ---------- Tooltip ---------- */

function RhythmTooltip({ active, payload, label }: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e4a] rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-[#e4e4e7] font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#a1a1aa]">{p.name}:</span>
          <span className="text-[#e4e4e7] font-medium">
            {typeof p.value === "number" && p.value % 1 !== 0 ? `${p.value.toFixed(1)}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function RhythmPage() {
  const { data, loading, error } = useDataContext();

  /* --- All computed data in one useMemo --- */
  const computed = useMemo(() => {
    if (!data) return null;
    const articles = data.articles;
    const categoryByWeek = data.dashboard_charts.heatmaps.category_by_week;

    // 1. Day of week distribution
    const dayCountMap: Record<string, number> = {};
    DAY_NAMES.forEach((d) => (dayCountMap[d] = 0));
    articles.forEach((a) => {
      const day = getDayOfWeek(a.date);
      if (day && dayCountMap[day] !== undefined) dayCountMap[day]++;
    });
    const totalArticles = Object.values(dayCountMap).reduce((s, v) => s + v, 0);
    const dayOfWeekData = DAY_NAMES.map((name, i) => ({
      name: DAY_SHORT[i],
      fullName: name,
      count: dayCountMap[name],
      pct: totalArticles > 0 ? (dayCountMap[name] / totalArticles) * 100 : 0,
    }));
    const busiestDay = dayOfWeekData.reduce((a, b) => (a.count > b.count ? a : b));

    // 2. Weekly content mix — from category_by_week (top 8 categories by total)
    const catTotals: Record<string, number> = {};
    Object.entries(categoryByWeek).forEach(([cat, weeks]) => {
      catTotals[cat] = Object.values(weeks).reduce((s, v) => s + v, 0);
    });
    const top8Cats = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([c]) => c);

    const weeklyMixData = WEEK_LABELS.map((label, wi) => {
      const weekKey = `week_${wi + 1}`;
      const row: Record<string, string | number> = { name: label };
      top8Cats.forEach((cat) => {
        row[cat] = categoryByWeek[cat]?.[weekKey] ?? 0;
      });
      return row;
    });

    // Find notable shifts: categories that changed most between week 1 and week 4
    const shifts = top8Cats.map((cat) => {
      const w1 = (categoryByWeek[cat]?.["week_1"] ?? 0);
      const w4 = (categoryByWeek[cat]?.["week_4"] ?? 0);
      return { cat, w1, w4, change: w4 - w1 };
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const topShift = shifts[0];

    // 3. Content depth by week — article_size distribution per week
    const weekSizeMap: Record<number, Record<string, number>> = { 0: {}, 1: {}, 2: {}, 3: {} };
    SIZE_TYPES.forEach((s) => { for (let w = 0; w < 4; w++) weekSizeMap[w][s] = 0; });
    articles.forEach((a) => {
      const wi = getWeekIndex(a.date);
      const size = a.article_size?.toLowerCase() || "brief";
      if (weekSizeMap[wi][size] !== undefined) weekSizeMap[wi][size]++;
    });
    const contentDepthData = WEEK_LABELS.map((label, wi) => ({
      name: label,
      ...weekSizeMap[wi],
    }));

    // 4. Sentiment trend by week
    const weekSentMap: Record<number, { total: number; count: number; breakdown: Record<string, number> }> = {};
    for (let w = 0; w < 4; w++) {
      weekSentMap[w] = { total: 0, count: 0, breakdown: { positive: 0, negative: 0, neutral: 0, mixed: 0 } };
    }
    articles.forEach((a) => {
      const wi = getWeekIndex(a.date);
      weekSentMap[wi].total += a.sentiment_score ?? 0;
      weekSentMap[wi].count++;
      if (weekSentMap[wi].breakdown[a.sentiment] !== undefined) {
        weekSentMap[wi].breakdown[a.sentiment]++;
      }
    });
    const sentimentTrendData = WEEK_LABELS.map((label, wi) => {
      const w = weekSentMap[wi];
      const avg = w.count > 0 ? w.total / w.count : 0;
      return {
        name: label,
        avgScore: parseFloat(avg.toFixed(2)),
        positive: w.breakdown.positive,
        negative: w.breakdown.negative,
        neutral: w.breakdown.neutral,
        mixed: w.breakdown.mixed,
        total: w.count,
      };
    });

    // 5. Heatmap — top 10 categories, 4 weeks, from category_by_week
    const top10Cats = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([c]) => c);

    const heatmapData = top10Cats.map((cat) => {
      const weeks = [1, 2, 3, 4].map((w) => categoryByWeek[cat]?.[`week_${w}`] ?? 0);
      return { cat, weeks, total: weeks.reduce((s, v) => s + v, 0) };
    });

    // Max value for heatmap color scaling
    const heatmapMax = Math.max(1, ...heatmapData.flatMap((r) => r.weeks));

    return {
      dayOfWeekData,
      busiestDay,
      totalArticles,
      weeklyMixData,
      top8Cats,
      topShift,
      contentDepthData,
      sentimentTrendData,
      heatmapData,
      heatmapMax,
      top10Cats,
    };
  }, [data]);

  /* --- Loading / Error states --- */
  if (loading) return <LoadingSkeleton />;
  if (error) return (
    <div className="flex items-center justify-center h-96">
      <p className="text-red-400">Error loading data: {error}</p>
    </div>
  );
  if (!computed) return null;

  const {
    dayOfWeekData, busiestDay, totalArticles,
    weeklyMixData, top8Cats, topShift,
    contentDepthData, sentimentTrendData,
    heatmapData, heatmapMax,
  } = computed;

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        <h1 className="text-2xl font-bold text-[#e4e4e7] flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[#f5a623]" />
          Publishing Rhythm
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          Editorial patterns and publishing cadence across January 2025 ({totalArticles} articles, Mon-Sat)
        </p>
      </motion.div>

      {/* --- Section 1: Day of Week Pattern --- */}
      <ChartCard
        title="Day of Week Pattern"
        subtitle="Percentage of articles published by weekday (no Sunday edition)"
        action={
          <span className="text-xs text-[#a1a1aa] bg-[#1e1e2e] px-2 py-1 rounded">
            Busiest: <span className="text-[#f5a623] font-medium">{busiestDay.fullName} ({busiestDay.count})</span>
          </span>
        }
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayOfWeekData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              />
              <Tooltip content={<RhythmTooltip />} />
              <Bar dataKey="pct" name="Share" radius={[4, 4, 0, 0]}>
                {dayOfWeekData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.fullName === busiestDay.fullName ? "#f5a623" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-[#a1a1aa] mt-2">
          Saturday carries the heaviest edition at {busiestDay.pct.toFixed(1)}% of all articles,
          consistent with weekend special supplements. Weekdays show relatively even distribution.
        </p>
      </ChartCard>

      {/* --- Row: Weekly Content Mix + Content Depth --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 2: Weekly Content Mix */}
        <ChartCard
          title="Weekly Content Mix"
          subtitle="How editorial focus shifted week over week (top 8 categories)"
          action={<Layers className="w-4 h-4 text-[#a1a1aa]" />}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyMixData} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<RhythmTooltip />} />
                {top8Cats.map((cat, i) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    name={categoryLabel(cat)}
                    stackId="mix"
                    fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {top8Cats.map((cat, i) => (
              <div key={cat} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                />
                <span className="text-[#a1a1aa]">{categoryLabel(cat)}</span>
              </div>
            ))}
          </div>
          {topShift && (
            <p className="text-xs text-[#a1a1aa] mt-2">
              <TrendingUp className="w-3 h-3 inline text-[#f5a623] mr-1" />
              Biggest shift: <span className="text-[#e4e4e7]">{categoryLabel(topShift.cat)}</span>{" "}
              went from {topShift.w1} to {topShift.w4} articles ({topShift.change > 0 ? "+" : ""}{topShift.change}).
            </p>
          )}
        </ChartCard>

        {/* Section 3: Content Depth by Week */}
        <ChartCard
          title="Content Depth by Week"
          subtitle="Article size distribution — are we publishing more leads or sidebars?"
          action={<BarChart3 className="w-4 h-4 text-[#a1a1aa]" />}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentDepthData} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<RhythmTooltip />} />
                {SIZE_TYPES.map((size) => (
                  <Bar
                    key={size}
                    dataKey={size}
                    name={SIZE_LABELS[size]}
                    stackId="depth"
                    fill={SIZE_COLORS[size]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {SIZE_TYPES.map((size) => (
              <div key={size} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SIZE_COLORS[size] }} />
                <span className="text-[#a1a1aa]">{SIZE_LABELS[size]}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* --- Section 4: Sentiment Trend by Week --- */}
      <ChartCard
        title="Sentiment Trend by Week"
        subtitle="Did the editorial tone shift across the month?"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar chart: avg sentiment score */}
          <div className="lg:col-span-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentTrendData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[-0.2, 0.2]}
                />
                <Tooltip content={<RhythmTooltip />} />
                <Bar dataKey="avgScore" name="Avg Sentiment" radius={[4, 4, 0, 0]}>
                  {sentimentTrendData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.avgScore >= 0 ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Weekly breakdown cards */}
          <div className="space-y-3">
            {sentimentTrendData.map((w) => (
              <div key={w.name} className="bg-[#0a0a0f] rounded-lg p-3 border border-[#1e1e2e]">
                <div className="text-xs text-[#a1a1aa] mb-1.5">{w.name} ({w.total} articles)</div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {SENTIMENT_TYPES.map((s) => (
                    <div key={s} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sentimentColor(s) }} />
                      <span className="text-[#a1a1aa] capitalize">{s}:</span>
                      <span className="text-[#e4e4e7]">{w[s]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* --- Section 5: Weekly Category Heatmap (CSS grid, NOT calendar) --- */}
      <ChartCard
        title="Weekly Category Heatmap"
        subtitle="Coverage intensity: top 10 categories across 4 weeks"
        action={<Grid3X3 className="w-4 h-4 text-[#a1a1aa]" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[#a1a1aa] font-medium py-2 px-3 w-40">Category</th>
                {WEEK_LABELS.map((w) => (
                  <th key={w} className="text-center text-[#a1a1aa] font-medium py-2 px-3">{w}</th>
                ))}
                <th className="text-center text-[#a1a1aa] font-medium py-2 px-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((row) => (
                <tr key={row.cat} className="border-t border-[#1e1e2e]">
                  <td className="py-2 px-3 text-[#e4e4e7] font-medium">{categoryLabel(row.cat)}</td>
                  {row.weeks.map((count, wi) => {
                    const intensity = heatmapMax > 0 ? count / heatmapMax : 0;
                    return (
                      <td key={wi} className="py-2 px-3 text-center">
                        <div
                          className="inline-flex items-center justify-center w-10 h-8 rounded text-xs font-medium"
                          style={{
                            backgroundColor: count === 0
                              ? "transparent"
                              : `rgba(245, 166, 35, ${0.15 + intensity * 0.7})`,
                            color: intensity > 0.5 ? "#0a0a0f" : "#e4e4e7",
                            border: count === 0 ? "1px solid #1e1e2e" : "none",
                          }}
                        >
                          {count || "-"}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-center text-[#a1a1aa] font-medium">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Color scale legend */}
        <div className="flex items-center gap-2 mt-4 text-xs text-[#a1a1aa]">
          <span>Low</span>
          <div className="flex gap-0.5">
            {[0.15, 0.3, 0.5, 0.7, 0.85].map((opacity) => (
              <div
                key={opacity}
                className="w-6 h-4 rounded-sm"
                style={{ backgroundColor: `rgba(245, 166, 35, ${opacity})` }}
              />
            ))}
          </div>
          <span>High</span>
        </div>
      </ChartCard>
    </div>
  );
}
