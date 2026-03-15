"use client";

import { useDataContext } from "@/lib/data";
import { categoryLabel, formatDate, sentimentColor } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Calendar, Clock, Sun, TrendingUp, TrendingDown, Zap, BarChart3,
  ChevronDown, ChevronUp, Flame, Lightbulb,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";

/* ---------- Constants ---------- */

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_INDEX: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5 };

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

const WEEK_COLORS = ["#3b82f6", "#8b5cf6", "#f5a623", "#22c55e"];

const CATEGORY_COLORS = [
  "#3b82f6", "#8b5cf6", "#f5a623", "#22c55e", "#ef4444",
  "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#a855f7",
  "#14b8a6", "#f97316",
];

/* ---------- Tooltip Components ---------- */

function RhythmTooltip({ active, payload, label }: {
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
          {p.name}: {typeof p.value === "number" && p.value % 1 !== 0 ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
}

function StackedTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl max-w-xs">
      <p className="text-xs text-[#a1a1aa] mb-1.5">{label}</p>
      {payload.filter(p => p.value > 0).map((p, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
      <p className="text-xs font-mono text-[#e4e4e7] mt-1 pt-1 border-t border-[#2e2e3e]">
        Total: {total}
      </p>
    </div>
  );
}

function WeeklyTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl max-w-xs">
      <p className="text-xs text-[#a1a1aa] mb-1.5">{label}</p>
      {payload.filter(p => p.value > 0).map((p, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {categoryLabel(p.name)}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function RhythmPage() {
  const { data, loading, error } = useDataContext();
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [expandedInsights, setExpandedInsights] = useState(false);

  const computed = useMemo(() => {
    if (!data) return null;

    const articles = data.articles;

    // --- Day of week counts ---
    const dayOfWeekCounts: Record<string, number> = {};
    const dayOfWeekSentiment: Record<string, number[]> = {};
    const dayOfWeekImpact: Record<string, { high: number; medium: number; low: number }> = {};
    DAY_NAMES.forEach((d) => {
      dayOfWeekCounts[d] = 0;
      dayOfWeekSentiment[d] = [];
      dayOfWeekImpact[d] = { high: 0, medium: 0, low: 0 };
    });

    // --- Daily aggregation ---
    const dailyMap: Record<string, {
      count: number;
      sentiments: number[];
      sizes: Record<string, number>;
      categories: Record<string, number>;
      impacts: Record<string, number>;
      leads: number;
    }> = {};

    articles.forEach((a) => {
      const d = new Date(a.date);
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

      if (dayName in dayOfWeekCounts) {
        dayOfWeekCounts[dayName] += 1;
        dayOfWeekSentiment[dayName].push(a.sentiment_score);
        dayOfWeekImpact[dayName][a.impact_level as "high" | "medium" | "low"] += 1;
      }

      if (!dailyMap[a.date]) {
        dailyMap[a.date] = { count: 0, sentiments: [], sizes: {}, categories: {}, impacts: {}, leads: 0 };
      }
      const dm = dailyMap[a.date];
      dm.count += 1;
      dm.sentiments.push(a.sentiment_score);
      dm.sizes[a.article_size] = (dm.sizes[a.article_size] || 0) + 1;
      dm.categories[a.category] = (dm.categories[a.category] || 0) + 1;
      dm.impacts[a.impact_level] = (dm.impacts[a.impact_level] || 0) + 1;
      if (a.article_size === "lead") dm.leads += 1;
    });

    // --- Stats: Busiest, Lightest, Peak, Span ---
    const dayEntries = Object.entries(dayOfWeekCounts).filter(([, v]) => v > 0);
    dayEntries.sort(([, a], [, b]) => b - a);
    const busiestDay = dayEntries[0];
    const lightestDay = dayEntries[dayEntries.length - 1];

    const dateEntries = Object.entries(dailyMap).sort(([, a], [, b]) => b.count - a.count);
    const peakDate = dateEntries[0];

    const sortedDates = Object.keys(dailyMap).sort();
    const publishingSpan = sortedDates.length;

    // --- Day of Week chart data ---
    const dowData = DAY_NAMES
      .filter((d) => dayOfWeekCounts[d] > 0)
      .map((d) => ({
        day: d.slice(0, 3),
        fullDay: d,
        articles: dayOfWeekCounts[d],
        avgSentiment: dayOfWeekSentiment[d].length > 0
          ? dayOfWeekSentiment[d].reduce((a, b) => a + b, 0) / dayOfWeekSentiment[d].length
          : 0,
      }));
    const avgPerDay = dowData.length > 0
      ? dowData.reduce((s, d) => s + d.articles, 0) / dowData.length
      : 0;

    // --- Calendar heatmap data (January 2026) ---
    // Jan 2026: starts on Thursday. Build week rows Mon-Sat (no Sunday).
    const calendarWeeks: Array<Array<{
      date: string | null;
      dayNum: number | null;
      count: number;
      avgSentiment: number;
      categories: Record<string, number>;
      sizes: Record<string, number>;
    } | null>> = [];

    // January 2026 has 31 days. Jan 1 = Thursday (day index 3 in Mon-based)
    const jan1DayIndex = 3; // Thursday = index 3 in Mon-Sat (0=Mon,5=Sat)
    let currentWeek: Array<typeof calendarWeeks[0][0]> = Array(6).fill(null);
    let weekIdx = 0;

    for (let day = 1; day <= 31; day++) {
      const dateStr = `2026-01-${String(day).padStart(2, "0")}`;
      const d = new Date(dateStr);
      const jsDay = d.getDay(); // 0=Sunday

      // Skip Sundays
      if (jsDay === 0) continue;

      // Convert to Mon-Sat index (Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5)
      const colIndex = jsDay - 1;

      const dm = dailyMap[dateStr];
      const cell = {
        date: dateStr,
        dayNum: day,
        count: dm?.count ?? 0,
        avgSentiment: dm?.sentiments.length
          ? dm.sentiments.reduce((a, b) => a + b, 0) / dm.sentiments.length
          : 0,
        categories: dm?.categories ?? {},
        sizes: dm?.sizes ?? {},
      };

      // Start new week if needed
      if (colIndex <= (currentWeek.findIndex((c) => c !== null) === -1 ? 6 : 0) && weekIdx > 0 && colIndex === 0) {
        calendarWeeks.push(currentWeek);
        currentWeek = Array(6).fill(null);
      }

      // Handle week breaks: if we're past Saturday, push current week
      if (currentWeek[colIndex] !== null && colIndex === 0) {
        calendarWeeks.push(currentWeek);
        currentWeek = Array(6).fill(null);
      }

      currentWeek[colIndex] = cell;

      // If Saturday, push week
      if (colIndex === 5) {
        calendarWeeks.push(currentWeek);
        currentWeek = Array(6).fill(null);
        weekIdx++;
      }
    }
    // Push remaining week
    if (currentWeek.some((c) => c !== null)) {
      calendarWeeks.push(currentWeek);
    }

    // Rebuild calendar more carefully
    const calWeeks: typeof calendarWeeks = [];
    let cWeek: typeof calendarWeeks[0] = Array(6).fill(null);

    for (let day = 1; day <= 31; day++) {
      const dateStr = `2026-01-${String(day).padStart(2, "0")}`;
      const d = new Date(dateStr);
      const jsDay = d.getDay();
      if (jsDay === 0) continue; // skip Sunday

      const colIdx = jsDay - 1; // Mon=0..Sat=5

      const dm = dailyMap[dateStr];
      const cell = {
        date: dateStr,
        dayNum: day,
        count: dm?.count ?? 0,
        avgSentiment: dm?.sentiments.length
          ? dm.sentiments.reduce((a, b) => a + b, 0) / dm.sentiments.length
          : 0,
        categories: dm?.categories ?? {},
        sizes: dm?.sizes ?? {},
      };

      if (cWeek[colIdx] !== null) {
        // Current slot occupied, push week and start new
        calWeeks.push(cWeek);
        cWeek = Array(6).fill(null);
      }

      cWeek = [...cWeek];
      cWeek[colIdx] = cell;

      if (colIdx === 5) {
        calWeeks.push(cWeek);
        cWeek = Array(6).fill(null);
      }
    }
    if (cWeek.some((c) => c !== null)) {
      calWeeks.push(cWeek);
    }

    // Max article count for intensity scaling
    const maxDailyCount = Math.max(...Object.values(dailyMap).map((d) => d.count), 1);

    // Top 5 categories globally for heatmap mini-bars
    const globalCats: Record<string, number> = {};
    articles.forEach((a) => { globalCats[a.category] = (globalCats[a.category] || 0) + 1; });
    const top5Categories = Object.entries(globalCats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([k]) => k);

    // --- Weekly Trends (category_by_week) ---
    const categoryByWeek = data.dashboard_charts.heatmaps.category_by_week;
    const weekKeys = ["week_1", "week_2", "week_3", "week_4"];
    const weekLabels = ["Week 1", "Week 2", "Week 3", "Week 4"];

    // Top 8 categories from category_by_week
    const catTotals: Record<string, number> = {};
    Object.entries(categoryByWeek).forEach(([cat, weeks]) => {
      catTotals[cat] = Object.values(weeks).reduce((s, v) => s + v, 0);
    });
    const top8Cats = Object.entries(catTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([k]) => k);

    // Build grouped bar data
    const weeklyTrendData = weekKeys.map((wk, i) => {
      const row: Record<string, string | number> = { week: weekLabels[i] };
      top8Cats.forEach((cat) => {
        row[cat] = categoryByWeek[cat]?.[wk] ?? 0;
      });
      return row;
    });

    // Notable shifts
    const notableShifts: string[] = [];
    top8Cats.forEach((cat) => {
      const w1 = categoryByWeek[cat]?.week_1 ?? 0;
      const w4 = categoryByWeek[cat]?.week_4 ?? 0;
      const diff = w4 - w1;
      if (Math.abs(diff) >= 5) {
        const direction = diff > 0 ? "jumped from" : "dropped from";
        notableShifts.push(
          `${categoryLabel(cat)} ${direction} ${w1} to ${w4} articles between Week 1 and Week 4`
        );
      }
    });

    // --- Daily Content Profile (stacked by article_size) ---
    const dailyProfileData = sortedDates.map((date) => {
      const dm = dailyMap[date];
      return {
        date: formatDate(date),
        fullDate: date,
        lead: dm?.sizes.lead ?? 0,
        secondary: dm?.sizes.secondary ?? 0,
        brief: dm?.sizes.brief ?? 0,
        sidebar: dm?.sizes.sidebar ?? 0,
        total: dm?.count ?? 0,
      };
    });

    // --- Sentiment by Week ---
    const sentimentByWeek = data.analyses.sentiment.sentiment_by_week;
    const sentimentWeekData = Object.entries(sentimentByWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([wk, avg], i) => ({
        week: wk.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()).replace(/ \w/, (c) => c.toUpperCase()),
        avgSentiment: Number(avg),
        color: WEEK_COLORS[i % WEEK_COLORS.length],
      }));

    // --- Content Velocity Insights ---
    // Days with most lead stories
    const leadDays = Object.entries(dailyMap)
      .filter(([, d]) => d.leads > 0)
      .sort(([, a], [, b]) => b.leads - a.leads)
      .slice(0, 3);

    // Correlation: article count vs sentiment
    const dailyPairs = Object.entries(dailyMap).map(([, d]) => ({
      count: d.count,
      avgSent: d.sentiments.length > 0 ? d.sentiments.reduce((a, b) => a + b, 0) / d.sentiments.length : 0,
    }));
    const n = dailyPairs.length;
    const meanCount = dailyPairs.reduce((s, p) => s + p.count, 0) / n;
    const meanSent = dailyPairs.reduce((s, p) => s + p.avgSent, 0) / n;
    let covXY = 0, varX = 0, varY = 0;
    dailyPairs.forEach((p) => {
      covXY += (p.count - meanCount) * (p.avgSent - meanSent);
      varX += (p.count - meanCount) ** 2;
      varY += (p.avgSent - meanSent) ** 2;
    });
    const correlation = varX > 0 && varY > 0 ? covXY / Math.sqrt(varX * varY) : 0;

    // Weekday vs weekend (Saturday) quality
    const weekdayArticles = articles.filter((a) => {
      const d = new Date(a.date).getDay();
      return d >= 1 && d <= 5;
    });
    const weekendArticles = articles.filter((a) => {
      const d = new Date(a.date).getDay();
      return d === 6;
    });

    const impactScore = (art: typeof articles) => {
      const scores = art.map((a) => a.impact_level === "high" ? 3 : a.impact_level === "medium" ? 2 : 1);
      return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    };

    const weekdayAvgImpact = impactScore(weekdayArticles);
    const weekendAvgImpact = impactScore(weekendArticles);

    return {
      busiestDay,
      lightestDay,
      peakDate,
      publishingSpan,
      dowData,
      avgPerDay,
      calWeeks,
      maxDailyCount,
      top5Categories,
      weeklyTrendData,
      top8Cats,
      notableShifts,
      dailyProfileData,
      sentimentWeekData,
      leadDays,
      correlation,
      weekdayAvgImpact,
      weekendAvgImpact,
      weekdayArticles: weekdayArticles.length,
      weekendArticles: weekendArticles.length,
    };
  }, [data]);

  if (loading) return <LoadingSkeleton />;
  if (error || !data || !computed) return <div className="p-8 text-red-400">Error: {error}</div>;

  const {
    busiestDay, lightestDay, peakDate, publishingSpan, dowData, avgPerDay,
    calWeeks, maxDailyCount, top5Categories, weeklyTrendData, top8Cats,
    notableShifts, dailyProfileData, sentimentWeekData, leadDays, correlation,
    weekdayAvgImpact, weekendAvgImpact, weekdayArticles, weekendArticles,
  } = computed;

  const activeCell = selectedCell ?? hoveredCell;
  const activeCellData = activeCell
    ? calWeeks.flat().find((c) => c?.date === activeCell)
    : null;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-[#f5a623]">Publishing</span>{" "}
          <span className="text-[#e4e4e7]">Rhythm</span>
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          When content gets published &middot; Scheduling patterns &middot; January 2026
        </p>
      </motion.div>

      {/* ====== 1. Publishing Rhythm Stats ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Busiest Day",
            value: busiestDay[0],
            sub: `${busiestDay[1]} articles`,
            icon: <Flame size={16} />,
            color: "#f5a623",
          },
          {
            label: "Lightest Day",
            value: lightestDay[0],
            sub: `${lightestDay[1]} articles`,
            icon: <Sun size={16} />,
            color: "#3b82f6",
          },
          {
            label: "Peak Date",
            value: formatDate(peakDate[0]),
            sub: `${peakDate[1].count} articles`,
            icon: <TrendingUp size={16} />,
            color: "#22c55e",
          },
          {
            label: "Publishing Span",
            value: `${publishingSpan} days`,
            sub: "Active publishing days",
            icon: <Calendar size={16} />,
            color: "#8b5cf6",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 h-1 rounded-b-xl" style={{ backgroundColor: stat.color, width: "100%" }} />
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: stat.color }}>{stat.icon}</span>
              <span className="text-xs text-[#a1a1aa]">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-[#e4e4e7] font-mono">{stat.value}</p>
            <p className="text-xs text-[#a1a1aa] mt-0.5">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ====== 2. Day of Week Pattern ====== */}
      <ChartCard
        title="Day of Week Pattern"
        subtitle={`Avg ${avgPerDay.toFixed(1)} articles/day \u2014 Saturday publishes ${busiestDay[1] > 0 && dowData.find(d => d.fullDay === "Tuesday") ? ((busiestDay[1] / (dowData.find(d => d.fullDay === "Tuesday")?.articles ?? 1) - 1) * 100).toFixed(0) : "0"}% more than Tuesday`}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dowData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="day" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <Tooltip content={<RhythmTooltip />} />
            <Bar dataKey="articles" name="Articles" radius={[4, 4, 0, 0]}>
              {dowData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.fullDay === busiestDay[0] ? "#f5a623" : "#3b82f6"}
                  opacity={entry.fullDay === busiestDay[0] ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Average line annotation */}
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-[#a1a1aa]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#f5a623] rounded inline-block" />
            Busiest ({busiestDay[0]})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#3b82f6] rounded inline-block" />
            Other days
          </span>
          <span className="font-mono text-[#a1a1aa]/60">
            Avg: {avgPerDay.toFixed(1)}/day
          </span>
        </div>
        <p className="text-xs text-[#a1a1aa]/60 mt-2 text-center italic">
          No Sunday publishing (Hindi newspaper weekly off)
        </p>
      </ChartCard>

      {/* ====== 3. Editorial Calendar Heatmap ====== */}
      <ChartCard
        title="Editorial Calendar Heatmap"
        subtitle="January 2026 \u2014 Cell intensity = article count, colored segments = category mix"
      >
        <div className="space-y-4">
          {/* Day headers */}
          <div className="grid grid-cols-6 gap-1.5">
            {DAY_SHORT.map((d) => (
              <div key={d} className="text-center text-[10px] text-[#a1a1aa] font-medium uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1.5">
            {calWeeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-6 gap-1.5">
                {week.map((cell, cIdx) => {
                  if (!cell || !cell.date) {
                    return <div key={cIdx} className="aspect-square rounded-lg bg-[#1e1e2e]/30" />;
                  }

                  const intensity = cell.count > 0
                    ? Math.max(0.15, cell.count / maxDailyCount)
                    : 0;
                  const isActive = activeCell === cell.date;
                  const sentDot = cell.count > 0
                    ? cell.avgSentiment >= 0.1 ? "#22c55e"
                      : cell.avgSentiment <= -0.1 ? "#ef4444"
                      : "#a1a1aa"
                    : "transparent";

                  // Mini category segments for top 5
                  const catSegments = top5Categories
                    .map((cat) => ({ cat, count: cell.categories[cat] ?? 0 }))
                    .filter((s) => s.count > 0);
                  const otherCount = cell.count - catSegments.reduce((s, c) => s + c.count, 0);
                  if (otherCount > 0) catSegments.push({ cat: "other", count: otherCount });
                  const totalSegments = catSegments.reduce((s, c) => s + c.count, 0);

                  return (
                    <motion.div
                      key={cell.date}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setSelectedCell(selectedCell === cell.date ? null : cell.date)}
                      onMouseEnter={() => setHoveredCell(cell.date)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`aspect-square rounded-lg cursor-pointer relative overflow-hidden transition-all border ${
                        isActive
                          ? "border-[#f5a623] ring-1 ring-[#f5a623]/30"
                          : "border-[#1e1e2e] hover:border-[#2e2e3e]"
                      }`}
                      style={{
                        backgroundColor: cell.count > 0
                          ? `rgba(245, 166, 35, ${intensity * 0.6})`
                          : "#1e1e2e",
                      }}
                    >
                      {/* Date number */}
                      <div className="absolute top-1 left-1.5 text-[10px] font-mono text-[#e4e4e7]/80">
                        {cell.dayNum}
                      </div>

                      {/* Article count */}
                      {cell.count > 0 && (
                        <div className="absolute top-1 right-1.5 text-[10px] font-mono font-bold text-[#e4e4e7]">
                          {cell.count}
                        </div>
                      )}

                      {/* Sentiment indicator */}
                      {cell.count > 0 && (
                        <div
                          className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: sentDot }}
                        />
                      )}

                      {/* Mini category bar at bottom */}
                      {cell.count > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-2 flex">
                          {catSegments.map((seg, sIdx) => {
                            const catColorIdx = top5Categories.indexOf(seg.cat);
                            const color = seg.cat === "other"
                              ? "#52525b"
                              : CATEGORY_COLORS[catColorIdx % CATEGORY_COLORS.length];
                            const width = totalSegments > 0 ? (seg.count / totalSegments) * 100 : 0;
                            return (
                              <div
                                key={sIdx}
                                style={{ width: `${width}%`, backgroundColor: color }}
                                className="h-full"
                              />
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider">Categories:</span>
            {top5Categories.map((cat, i) => (
              <span key={cat} className="flex items-center gap-1 text-[10px] text-[#a1a1aa]">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: CATEGORY_COLORS[i] }} />
                {categoryLabel(cat)}
              </span>
            ))}
            <span className="flex items-center gap-1 text-[10px] text-[#a1a1aa]">
              <span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#52525b]" />
              Other
            </span>
            <span className="ml-auto flex items-center gap-2 text-[10px] text-[#a1a1aa]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /> Positive
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" /> Negative
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a1a1aa]" /> Neutral
              </span>
            </span>
          </div>

          {/* Detail panel for selected/hovered cell */}
          <AnimatePresence>
            {activeCellData && activeCellData.count > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#e4e4e7] font-medium">
                    {new Date(activeCellData.date!).toLocaleDateString("en-IN", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#f5a623]/10 text-[#f5a623]">
                    {activeCellData.count} articles
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-[#52525b] uppercase tracking-wider text-[10px] mb-1">Sentiment</p>
                    <p className="font-mono" style={{ color: sentimentColor(activeCellData.avgSentiment >= 0.1 ? "positive" : activeCellData.avgSentiment <= -0.1 ? "negative" : "neutral") }}>
                      {activeCellData.avgSentiment.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#52525b] uppercase tracking-wider text-[10px] mb-1">Categories</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(activeCellData.categories)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 4)
                        .map(([cat, count]) => (
                          <span key={cat} className="text-[10px] text-[#a1a1aa]">
                            {categoryLabel(cat)}: {count}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[#52525b] uppercase tracking-wider text-[10px] mb-1">Sizes</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(activeCellData.sizes)
                        .sort(([, a], [, b]) => b - a)
                        .map(([size, count]) => (
                          <span key={size} className="text-[10px]" style={{ color: SIZE_COLORS[size] ?? "#a1a1aa" }}>
                            {SIZE_LABELS[size] ?? size}: {count}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ChartCard>

      {/* ====== 4. Weekly Trends ====== */}
      <ChartCard
        title="Weekly Content Mix"
        subtitle="How category distribution shifted across 4 weeks (top 8 categories)"
        action={
          notableShifts.length > 0 ? (
            <span className="text-[10px] text-[#f5a623] flex items-center gap-1">
              <Zap size={10} />
              {notableShifts.length} notable shift{notableShifts.length > 1 ? "s" : ""}
            </span>
          ) : null
        }
      >
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={weeklyTrendData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="week" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <Tooltip content={<WeeklyTooltip />} />
            {top8Cats.map((cat, i) => (
              <Bar
                key={cat}
                dataKey={cat}
                name={cat}
                stackId="a"
                fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>

        {/* Category legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {top8Cats.map((cat, i) => (
            <span key={cat} className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: CATEGORY_COLORS[i] }} />
              {categoryLabel(cat)}
            </span>
          ))}
        </div>

        {/* Notable shifts */}
        {notableShifts.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {notableShifts.map((shift, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Zap size={12} className="text-[#f5a623] flex-shrink-0 mt-0.5" />
                <span className="text-[#a1a1aa]">{shift}</span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* ====== 5. Daily Content Profile ====== */}
      <ChartCard
        title="Daily Content Profile"
        subtitle="Article count by placement type \u2014 On heavy days, do we add more leads or just more sidebars?"
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={dailyProfileData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 10 }} interval={1} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <Tooltip content={<StackedTooltip />} />
            <Bar dataKey="lead" name="Lead" stackId="size" fill={SIZE_COLORS.lead} />
            <Bar dataKey="secondary" name="Secondary" stackId="size" fill={SIZE_COLORS.secondary} />
            <Bar dataKey="brief" name="Brief" stackId="size" fill={SIZE_COLORS.brief} />
            <Bar dataKey="sidebar" name="Sidebar" stackId="size" fill={SIZE_COLORS.sidebar} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-2">
          {Object.entries(SIZE_COLORS).map(([size, color]) => (
            <span key={size} className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }} />
              {SIZE_LABELS[size]}
            </span>
          ))}
        </div>
      </ChartCard>

      {/* ====== 6. Sentiment by Week ====== */}
      <ChartCard
        title="Sentiment by Week"
        subtitle="Did the editorial tone shift over the month?"
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={sentimentWeekData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="week" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
            <YAxis
              domain={[-1, 1]}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip content={<RhythmTooltip />} />
            <Bar dataKey="avgSentiment" name="Avg Sentiment" radius={[4, 4, 0, 0]}>
              {sentimentWeekData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={WEEK_COLORS[idx % WEEK_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Interpretation */}
        <div className="mt-3 p-2.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
          {(() => {
            if (sentimentWeekData.length < 2) return null;
            const first = sentimentWeekData[0]?.avgSentiment ?? 0;
            const last = sentimentWeekData[sentimentWeekData.length - 1]?.avgSentiment ?? 0;
            const diff = last - first;
            const direction = diff > 0.05 ? "more positive" : diff < -0.05 ? "more negative" : "relatively stable";
            return (
              <p className="text-xs text-[#a1a1aa]">
                Editorial tone became <span className="font-medium" style={{ color: diff > 0.05 ? "#22c55e" : diff < -0.05 ? "#ef4444" : "#a1a1aa" }}>{direction}</span> over the month
                ({sentimentWeekData[0]?.week}: {first.toFixed(3)} {" -> "} {sentimentWeekData[sentimentWeekData.length - 1]?.week}: {last.toFixed(3)})
              </p>
            );
          })()}
        </div>
      </ChartCard>

      {/* ====== 7. Content Velocity Insights ====== */}
      <ChartCard
        title="Content Velocity Insights"
        subtitle="Patterns between publishing volume, quality, and editorial tone"
        action={
          <button
            onClick={() => setExpandedInsights(!expandedInsights)}
            className="flex items-center gap-1 text-xs text-[#a1a1aa] hover:text-[#e4e4e7] transition-colors"
          >
            {expandedInsights ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expandedInsights ? "Less" : "More"}
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Days with most lead stories */}
          <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={14} className="text-[#f5a623]" />
              <p className="text-xs text-[#a1a1aa] uppercase tracking-wider font-medium">Top Lead Story Days</p>
            </div>
            <div className="space-y-2">
              {leadDays.map(([date, dm]) => (
                <div key={date} className="flex items-center justify-between">
                  <span className="text-sm text-[#e4e4e7] font-mono">{formatDate(date)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#f5a623] font-mono font-bold">{dm.leads} lead{dm.leads > 1 ? "s" : ""}</span>
                    <span className="text-[10px] text-[#52525b]">/ {dm.count} total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volume vs Sentiment Correlation */}
          <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-[#3b82f6]" />
              <p className="text-xs text-[#a1a1aa] uppercase tracking-wider font-medium">Volume vs Sentiment</p>
            </div>
            <div className="text-center py-2">
              <p className="text-3xl font-mono font-bold" style={{
                color: Math.abs(correlation) > 0.3
                  ? correlation < 0 ? "#ef4444" : "#22c55e"
                  : "#a1a1aa",
              }}>
                {correlation.toFixed(2)}
              </p>
              <p className="text-xs text-[#a1a1aa] mt-1">Pearson Correlation</p>
              <p className="text-[10px] text-[#52525b] mt-2">
                {Math.abs(correlation) < 0.1
                  ? "No meaningful correlation between article volume and sentiment"
                  : correlation < -0.3
                  ? "Higher volume days tend to be more negative (crisis coverage spikes)"
                  : correlation > 0.3
                  ? "Higher volume days tend to be more positive (optimistic news bundles)"
                  : correlation < 0
                  ? "Weak negative link \u2014 busier days lean slightly more negative"
                  : "Weak positive link \u2014 busier days lean slightly more positive"}
              </p>
            </div>
          </div>

          {/* Weekday vs Weekend Quality */}
          <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-[#8b5cf6]" />
              <p className="text-xs text-[#a1a1aa] uppercase tracking-wider font-medium">Weekday vs Saturday</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#a1a1aa]">Mon-Fri ({weekdayArticles} articles)</span>
                <span className="text-sm font-mono text-[#e4e4e7] font-bold">{weekdayAvgImpact.toFixed(2)}</span>
              </div>
              <div className="h-2 rounded-full bg-[#1e1e2e] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#3b82f6]"
                  style={{ width: `${(weekdayAvgImpact / 3) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#a1a1aa]">Saturday ({weekendArticles} articles)</span>
                <span className="text-sm font-mono text-[#e4e4e7] font-bold">{weekendAvgImpact.toFixed(2)}</span>
              </div>
              <div className="h-2 rounded-full bg-[#1e1e2e] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#f5a623]"
                  style={{ width: `${(weekendAvgImpact / 3) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-[#52525b]">
                Impact score: High=3, Medium=2, Low=1.{" "}
                {weekendAvgImpact > weekdayAvgImpact
                  ? "Saturday editions carry higher-impact content on average."
                  : weekdayAvgImpact > weekendAvgImpact
                  ? "Weekday editions carry higher-impact content on average."
                  : "Impact quality is similar across weekdays and Saturday."}
              </p>
            </div>
          </div>
        </div>

        {/* Expanded additional insights */}
        <AnimatePresence>
          {expandedInsights && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={14} className="text-[#f5a623]" />
                    <p className="text-xs text-[#a1a1aa] uppercase tracking-wider font-medium">Editorial Patterns</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      {
                        insight: `Saturday (${busiestDay[1]} articles) is the marquee edition with ${((busiestDay[1] / data.articles.length) * 100).toFixed(0)}% of all weekly content \u2014 the "special weekend supplement" effect.`,
                        icon: <Flame size={12} className="text-[#f5a623]" />,
                      },
                      {
                        insight: `Monday (${lightestDay[1]} articles) is the lightest day, likely due to Sunday being a publishing holiday \u2014 less overnight news to report.`,
                        icon: <Sun size={12} className="text-[#3b82f6]" />,
                      },
                      {
                        insight: `Peak date ${formatDate(peakDate[0])} saw ${peakDate[1].count} articles \u2014 ${((peakDate[1].count / (data.articles.length / publishingSpan)) - 1) > 0 ? ((peakDate[1].count / (data.articles.length / publishingSpan) - 1) * 100).toFixed(0) : "0"}% above daily average, suggesting a major news event.`,
                        icon: <TrendingUp size={12} className="text-[#22c55e]" />,
                      },
                      {
                        insight: dowData.length >= 2
                          ? `The gap between busiest and lightest day is ${busiestDay[1] - lightestDay[1]} articles \u2014 a ${((busiestDay[1] / lightestDay[1] - 1) * 100).toFixed(0)}% swing that editors should factor into scheduling.`
                          : "Insufficient day-of-week variation data.",
                        icon: <BarChart3 size={12} className="text-[#8b5cf6]" />,
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2 text-xs text-[#a1a1aa] leading-relaxed">
                        <span className="mt-0.5 flex-shrink-0">{item.icon}</span>
                        <span>{item.insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ChartCard>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Data Source: Amar Ujala Karobar Section &middot; January 2026 &middot; {data.articles.length} Articles Analyzed
      </div>
    </div>
  );
}
