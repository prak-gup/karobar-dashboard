"use client";

import { useDataContext } from "@/lib/data";
import { categoryLabel, sentimentColor, sentimentBg, formatDate } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Shuffle,
  AlertTriangle, Eye, ShieldAlert, Calendar, Newspaper,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import type { Article } from "@/lib/types";

/* ---------- Constants ---------- */

const SENTIMENT_CONFIG: Record<string, { color: string; icon: typeof TrendingUp; label: string }> = {
  positive: { color: "#22c55e", icon: TrendingUp, label: "Positive" },
  negative: { color: "#ef4444", icon: TrendingDown, label: "Negative" },
  neutral: { color: "#a1a1aa", icon: Minus, label: "Neutral" },
  mixed: { color: "#f59e0b", icon: Shuffle, label: "Mixed" },
};

const SIZE_ORDER = ["lead", "secondary_lead", "anchor", "secondary", "brief"];
const IMPACT_ORDER = ["high", "medium", "low"];

/* ---------- Custom Tooltip ---------- */

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<any>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-[#a1a1aa] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-mono font-medium" style={{ color: p.color || p.stroke || "#e4e4e7" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(3) : p.value}
        </p>
      ))}
    </div>
  );
}

/* ---------- Gradient Definitions for Area Chart ---------- */

function SentimentGradients() {
  return (
    <defs>
      <linearGradient id="sentimentPosGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="sentimentNegGrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

/* ---------- Main Page ---------- */

export default function SentimentLensPage() {
  const { data, loading, error } = useDataContext();
  const [selectedBiasCategory, setSelectedBiasCategory] = useState<string | null>(null);

  const computed = useMemo(() => {
    if (!data) return null;

    const articles = data.articles;
    const total = articles.length;

    // 1. Sentiment counts
    const sentimentCounts: Record<string, number> = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    articles.forEach((a) => {
      sentimentCounts[a.sentiment] = (sentimentCounts[a.sentiment] || 0) + 1;
    });

    // 2. Daily sentiment trend data
    const sentimentDaily = data.dashboard_charts.time_series.sentiment_daily.map((d) => {
      const posValue = Math.max(0, d.value);
      const negValue = Math.min(0, d.value);
      return {
        date: formatDate(d.date),
        rawDate: d.date,
        sentiment: d.value,
        positive: posValue,
        negative: negValue,
      };
    });

    // 3. Sentiment by category
    const sentimentByCategory = data.analyses.sentiment.sentiment_by_category;
    const catSentimentData = Object.entries(sentimentByCategory)
      .map(([cat, avg]) => ({
        category: categoryLabel(cat),
        rawCategory: cat,
        sentiment: Number(avg),
      }))
      .sort((a, b) => a.sentiment - b.sentiment);

    // 4. Sentiment x Article Size
    const sizeBuckets: Record<string, { totalScore: number; count: number }> = {};
    articles.forEach((a) => {
      if (!sizeBuckets[a.article_size]) sizeBuckets[a.article_size] = { totalScore: 0, count: 0 };
      sizeBuckets[a.article_size].totalScore += a.sentiment_score;
      sizeBuckets[a.article_size].count += 1;
    });
    const sizeLabel = (s: string) => s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const sizeSentimentData = SIZE_ORDER
      .filter((s) => sizeBuckets[s])
      .map((s) => ({
        size: sizeLabel(s),
        rawSize: s,
        avgSentiment: sizeBuckets[s].totalScore / sizeBuckets[s].count,
        count: sizeBuckets[s].count,
      }));

    // 5. Sentiment x Impact
    const impactBuckets: Record<string, { totalScore: number; count: number }> = {};
    articles.forEach((a) => {
      if (!impactBuckets[a.impact_level]) impactBuckets[a.impact_level] = { totalScore: 0, count: 0 };
      impactBuckets[a.impact_level].totalScore += a.sentiment_score;
      impactBuckets[a.impact_level].count += 1;
    });
    const impactSentimentData = IMPACT_ORDER
      .filter((imp) => impactBuckets[imp])
      .map((imp) => ({
        impact: imp.charAt(0).toUpperCase() + imp.slice(1),
        rawImpact: imp,
        avgSentiment: impactBuckets[imp].totalScore / impactBuckets[imp].count,
        count: impactBuckets[imp].count,
      }));

    // 6. Most positive & negative days with sample headlines
    const mostPositiveDays = data.analyses.sentiment.most_positive_days.slice(0, 5);
    const mostNegativeDays = data.analyses.sentiment.most_negative_days.slice(0, 5);

    const articlesByDate: Record<string, Article[]> = {};
    articles.forEach((a) => {
      if (!articlesByDate[a.date]) articlesByDate[a.date] = [];
      articlesByDate[a.date].push(a);
    });

    const positiveWithHeadlines = mostPositiveDays.map((d) => ({
      ...d,
      headlines: (articlesByDate[d.date] || [])
        .sort((a, b) => b.sentiment_score - a.sentiment_score)
        .slice(0, 3)
        .map((a) => ({ headline: a.headline, sentiment: a.sentiment, score: a.sentiment_score })),
    }));

    const negativeWithHeadlines = mostNegativeDays.map((d) => ({
      ...d,
      headlines: (articlesByDate[d.date] || [])
        .sort((a, b) => a.sentiment_score - b.sentiment_score)
        .slice(0, 3)
        .map((a) => ({ headline: a.headline, sentiment: a.sentiment, score: a.sentiment_score })),
    }));

    // 7. Bias indicators
    const overallAvg = data.analyses.sentiment.overall_avg_sentiment_score;

    // Category deviations
    const categoryDeviations = Object.entries(sentimentByCategory)
      .map(([cat, avg]) => ({
        category: categoryLabel(cat),
        rawCategory: cat,
        avgSentiment: Number(avg),
        deviation: Number(avg) - overallAvg,
        absDeviation: Math.abs(Number(avg) - overallAvg),
      }))
      .sort((a, b) => b.absDeviation - a.absDeviation);

    const topDeviations = categoryDeviations.filter((d) => d.absDeviation > 0.1).slice(0, 5);

    // Optimistic bias check: positive > 2x negative
    const posCount = sentimentCounts.positive || 0;
    const negCount = sentimentCounts.negative || 0;
    const hasOptimisticBias = posCount > 2 * negCount;
    const optimismRatio = negCount > 0 ? (posCount / negCount).toFixed(1) : "Inf";

    // Categories with zero negative coverage
    const catSentiments: Record<string, Record<string, number>> = {};
    articles.forEach((a) => {
      if (!catSentiments[a.category]) catSentiments[a.category] = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
      catSentiments[a.category][a.sentiment] = (catSentiments[a.category][a.sentiment] || 0) + 1;
    });
    const blindSpotCategories = Object.entries(catSentiments)
      .filter(([, counts]) => (counts.negative || 0) === 0 && ((counts.positive || 0) + (counts.neutral || 0) + (counts.mixed || 0)) >= 3)
      .map(([cat]) => categoryLabel(cat));

    // Categories that are overwhelmingly one-sided (>80% same sentiment)
    const lopsidedCategories = Object.entries(catSentiments)
      .map(([cat, counts]) => {
        const catTotal = Object.values(counts).reduce((a, b) => a + b, 0);
        if (catTotal < 5) return null;
        const dominant = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
        const dominantPct = (dominant[1] / catTotal) * 100;
        if (dominantPct >= 80) {
          return { category: categoryLabel(cat), sentiment: dominant[0], pct: dominantPct, total: catTotal };
        }
        return null;
      })
      .filter(Boolean) as { category: string; sentiment: string; pct: number; total: number }[];

    return {
      total,
      sentimentCounts,
      sentimentDaily,
      catSentimentData,
      sizeSentimentData,
      impactSentimentData,
      positiveWithHeadlines,
      negativeWithHeadlines,
      overallAvg,
      topDeviations,
      hasOptimisticBias,
      optimismRatio,
      posCount,
      negCount,
      blindSpotCategories,
      lopsidedCategories,
      categoryDeviations,
    };
  }, [data]);

  if (loading) return <LoadingSkeleton />;
  if (error || !data || !computed) return <div className="p-8 text-red-400">Error: {error}</div>;

  const biasIndicatorCount =
    (computed.topDeviations.length > 0 ? 1 : 0) +
    (computed.hasOptimisticBias ? 1 : 0) +
    (computed.blindSpotCategories.length > 0 ? 1 : 0) +
    (computed.lopsidedCategories.length > 0 ? 1 : 0);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-[#f5a623]">Sentiment</span>{" "}
          <span className="text-[#e4e4e7]">Lens</span>
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          Editorial tone and potential bias analysis &middot; {computed.total} articles &middot; January 2026
        </p>
      </motion.div>

      {/* ====== 1. Sentiment Overview — 4 Stat Cards ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["positive", "negative", "neutral", "mixed"] as const).map((key, i) => {
          const config = SENTIMENT_CONFIG[key];
          const count = computed.sentimentCounts[key] || 0;
          const pct = computed.total > 0 ? ((count / computed.total) * 100) : 0;
          const Icon = config.icon;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 relative overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
                  <Icon size={16} style={{ color: config.color }} />
                </div>
                <span className="text-xs text-[#a1a1aa] font-medium">{config.label}</span>
              </div>
              <p className="text-3xl font-bold font-mono" style={{ color: config.color }}>
                {count}
              </p>
              <p className="text-xs text-[#a1a1aa] mt-1 font-mono">
                {pct.toFixed(1)}% of total
              </p>
              {/* Proportional bar */}
              <div className="mt-3 h-1.5 rounded-full bg-[#0a0a0f] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: config.color }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ====== 2. Daily Sentiment Trend ====== */}
      <ChartCard
        title="Daily Sentiment Trend"
        subtitle="Average daily sentiment score across all articles published that day. Green = positive bias, Red = negative bias."
      >
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={computed.sentimentDaily} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
            <SentimentGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 10 }} interval={1} />
            <YAxis
              domain={[-0.5, 0.8]}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip content={<ChartTooltip />} />
            {/* Zero reference line */}
            <Area
              type="monotone"
              dataKey="positive"
              fill="url(#sentimentPosGrad)"
              stroke="none"
              name="Positive zone"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="negative"
              fill="url(#sentimentNegGrad)"
              stroke="none"
              name="Negative zone"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="sentiment"
              stroke="#e4e4e7"
              strokeWidth={2}
              dot={(props) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { cx, cy, payload } = props as any;
                const color = payload.sentiment >= 0 ? "#22c55e" : "#ef4444";
                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3.5} fill={color} stroke="#12121a" strokeWidth={1.5} />;
              }}
              activeDot={{ r: 5, stroke: "#e4e4e7", strokeWidth: 2 }}
              name="Avg Sentiment"
            />
            {/* Zero line */}
            <Line
              type="monotone"
              dataKey={() => 0}
              stroke="#a1a1aa"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              name="Baseline"
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[#a1a1aa]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-500/30" /> Positive territory
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500/30" /> Negative territory
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 border-t border-dashed border-[#a1a1aa]" /> Zero baseline
          </span>
        </div>
      </ChartCard>

      {/* ====== 3. Sentiment by Category — Horizontal Bar ====== */}
      <ChartCard
        title="Sentiment by Category"
        subtitle="Average sentiment score per content category. Are we covering some beats too positively or negatively?"
      >
        <ResponsiveContainer width="100%" height={Math.max(300, computed.catSentimentData.length * 36)}>
          <BarChart
            data={computed.catSentimentData}
            layout="vertical"
            margin={{ top: 5, right: 40, bottom: 5, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
            <XAxis
              type="number"
              domain={[-0.5, 0.8]}
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={130}
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { category: string; sentiment: number };
                return (
                  <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
                    <p className="text-sm text-[#e4e4e7] font-medium">{d.category}</p>
                    <p className="text-xs font-mono" style={{ color: d.sentiment >= 0 ? "#22c55e" : "#ef4444" }}>
                      Avg Sentiment: {d.sentiment.toFixed(3)}
                    </p>
                    <p className="text-xs text-[#a1a1aa]">
                      {d.sentiment >= 0 ? "Leans positive" : "Leans negative"}
                    </p>
                  </div>
                );
              }}
            />
            {/* Vertical zero line */}
            <Bar dataKey="sentiment" radius={[0, 4, 4, 0]} name="Avg Sentiment">
              {computed.catSentimentData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.sentiment >= 0 ? "#22c55e" : "#ef4444"}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-sm bg-[#ef4444]" />
            <span className="text-[#a1a1aa]">Negative lean</span>
          </span>
          <span className="text-xs text-[#52525b]">|</span>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-sm bg-[#22c55e]" />
            <span className="text-[#a1a1aa]">Positive lean</span>
          </span>
        </div>
      </ChartCard>

      {/* ====== 4 & 5: Sentiment x Size + Sentiment x Impact ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 4. Sentiment x Article Size */}
        <ChartCard
          title="Sentiment x Article Size"
          subtitle="Does editorial prominence correlate with tone? Do lead stories lean more positive?"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={computed.sizeSentimentData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="size" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { size: string; avgSentiment: number; count: number };
                  return (
                    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
                      <p className="text-sm text-[#e4e4e7] font-medium">{d.size}</p>
                      <p className="text-xs font-mono" style={{ color: d.avgSentiment >= 0 ? "#22c55e" : "#ef4444" }}>
                        Avg Sentiment: {d.avgSentiment.toFixed(3)}
                      </p>
                      <p className="text-xs text-[#a1a1aa]">{d.count} articles</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="avgSentiment" radius={[4, 4, 0, 0]} name="Avg Sentiment">
                {computed.sizeSentimentData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.avgSentiment >= 0 ? "#22c55e" : "#ef4444"}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {computed.sizeSentimentData.map((d) => (
              <div key={d.rawSize} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
                <span className="text-[#a1a1aa]">{d.size}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono" style={{ color: d.avgSentiment >= 0 ? "#22c55e" : "#ef4444" }}>
                    {d.avgSentiment.toFixed(3)}
                  </span>
                  <span className="text-[#52525b]">({d.count})</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* 5. Sentiment x Impact */}
        <ChartCard
          title="Sentiment x Impact Level"
          subtitle="Do high-impact stories skew negative? Is bad news = big news?"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={computed.impactSentimentData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="impact" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { impact: string; avgSentiment: number; count: number };
                  return (
                    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
                      <p className="text-sm text-[#e4e4e7] font-medium">{d.impact} Impact</p>
                      <p className="text-xs font-mono" style={{ color: d.avgSentiment >= 0 ? "#22c55e" : "#ef4444" }}>
                        Avg Sentiment: {d.avgSentiment.toFixed(3)}
                      </p>
                      <p className="text-xs text-[#a1a1aa]">{d.count} articles</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="avgSentiment" radius={[4, 4, 0, 0]} name="Avg Sentiment">
                {computed.impactSentimentData.map((entry, idx) => {
                  const impactColors: Record<string, string> = { High: "#ef4444", Medium: "#f59e0b", Low: "#3b82f6" };
                  return (
                    <Cell
                      key={idx}
                      fill={impactColors[entry.impact] || "#a1a1aa"}
                      fillOpacity={0.8}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {computed.impactSentimentData.map((d) => {
              const impactColors: Record<string, string> = { High: "#ef4444", Medium: "#f59e0b", Low: "#3b82f6" };
              const color = impactColors[d.impact] || "#a1a1aa";
              return (
                <div key={d.rawImpact} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm text-[#e4e4e7]">{d.impact} Impact</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono" style={{ color: d.avgSentiment >= 0 ? "#22c55e" : "#ef4444" }}>
                      {d.avgSentiment >= 0 ? "+" : ""}{d.avgSentiment.toFixed(3)}
                    </span>
                    <span className="text-[#52525b]">{d.count} articles</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[#a1a1aa] mt-3 px-1">
            {computed.impactSentimentData.length > 0 && computed.impactSentimentData[0].avgSentiment < computed.impactSentimentData[computed.impactSentimentData.length - 1]?.avgSentiment
              ? "High-impact stories trend more negative -- confirming the \"bad news is big news\" editorial pattern."
              : "High-impact stories do not necessarily skew negative in this dataset."
            }
          </p>
        </ChartCard>
      </div>

      {/* ====== 6. Most Positive & Negative Days ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Most Positive Days */}
        <ChartCard
          title="Most Positive Days"
          subtitle="Days when editorial coverage leaned most optimistic"
          action={<TrendingUp size={16} className="text-green-400" />}
        >
          <div className="space-y-3">
            {computed.positiveWithHeadlines.map((day, i) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="p-3 rounded-lg bg-green-500/5 border border-green-500/15 hover:border-green-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-green-400" />
                    <span className="text-sm font-medium text-[#e4e4e7]">{formatDate(day.date)}</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-green-400">
                    +{day.avg_sentiment.toFixed(3)}
                  </span>
                </div>
                {day.headlines.length > 0 && (
                  <div className="space-y-1 ml-5">
                    {day.headlines.map((h, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs">
                        <Newspaper size={10} className="text-[#52525b] mt-0.5 flex-shrink-0" />
                        <span className="text-[#a1a1aa] line-clamp-1">{h.headline}</span>
                        <span className="font-mono flex-shrink-0 ml-auto" style={{ color: sentimentColor(h.sentiment) }}>
                          {h.score.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </ChartCard>

        {/* Most Negative Days */}
        <ChartCard
          title="Most Negative Days"
          subtitle="Days when editorial coverage leaned most pessimistic"
          action={<TrendingDown size={16} className="text-red-400" />}
        >
          <div className="space-y-3">
            {computed.negativeWithHeadlines.map((day, i) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, x: 10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="p-3 rounded-lg bg-red-500/5 border border-red-500/15 hover:border-red-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-red-400" />
                    <span className="text-sm font-medium text-[#e4e4e7]">{formatDate(day.date)}</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-red-400">
                    {day.avg_sentiment.toFixed(3)}
                  </span>
                </div>
                {day.headlines.length > 0 && (
                  <div className="space-y-1 ml-5">
                    {day.headlines.map((h, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs">
                        <Newspaper size={10} className="text-[#52525b] mt-0.5 flex-shrink-0" />
                        <span className="text-[#a1a1aa] line-clamp-1">{h.headline}</span>
                        <span className="font-mono flex-shrink-0 ml-auto" style={{ color: sentimentColor(h.sentiment) }}>
                          {h.score.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ====== 7. Potential Bias Indicators ====== */}
      <ChartCard
        title="Potential Bias Indicators"
        subtitle={`${biasIndicatorCount} potential editorial bias pattern${biasIndicatorCount !== 1 ? "s" : ""} detected`}
        action={<AlertTriangle size={16} className="text-amber-400" />}
      >
        <div className="space-y-4">
          {/* Optimistic Bias */}
          {computed.hasOptimisticBias && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp size={16} className="text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-300">Optimistic Bias Detected</h4>
                  <p className="text-xs text-[#a1a1aa] mt-1">
                    Positive coverage ({computed.posCount} articles) is <span className="text-amber-300 font-mono font-bold">{computed.optimismRatio}x</span> the
                    negative coverage ({computed.negCount} articles). This exceeds the 2x threshold, suggesting an optimistic
                    editorial lean. Editors should verify if this reflects reality or selection bias.
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-[#0a0a0f] overflow-hidden flex">
                    <div
                      className="h-full bg-green-500 rounded-l-full"
                      style={{ width: `${(computed.posCount / computed.total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${(computed.negCount / computed.total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-zinc-500"
                      style={{ width: `${((computed.total - computed.posCount - computed.negCount) / computed.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[10px] text-[#a1a1aa]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Positive</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Negative</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500" /> Other</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Category Deviations */}
          {computed.topDeviations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldAlert size={16} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-300">Category Sentiment Deviations</h4>
                  <p className="text-xs text-[#a1a1aa] mt-1">
                    These categories deviate most from the overall average sentiment ({computed.overallAvg.toFixed(3)}).
                    Large deviations may indicate systematic editorial bias on specific beats.
                  </p>
                  <div className="mt-3 space-y-2">
                    {computed.topDeviations.map((d, i) => {
                      const isPositive = d.deviation > 0;
                      return (
                        <button
                          key={d.rawCategory}
                          onClick={() => setSelectedBiasCategory(selectedBiasCategory === d.rawCategory ? null : d.rawCategory)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                            selectedBiasCategory === d.rawCategory
                              ? "bg-[#1e1e2e] border border-amber-500/20"
                              : "bg-[#0a0a0f]/60 border border-[#1e1e2e] hover:border-[#2e2e3e]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#52525b] font-mono w-4">{i + 1}.</span>
                            <span className="text-xs text-[#e4e4e7]">{d.category}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-mono" style={{ color: d.avgSentiment >= 0 ? "#22c55e" : "#ef4444" }}>
                              {d.avgSentiment.toFixed(3)}
                            </span>
                            <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                              isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                            }`}>
                              {isPositive ? "+" : ""}{d.deviation.toFixed(3)} vs avg
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Blind Spot Categories */}
          {computed.blindSpotCategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Eye size={16} className="text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-300">Possible Blind Spots</h4>
                  <p className="text-xs text-[#a1a1aa] mt-1">
                    These categories have zero negative coverage (with 3+ articles). This could indicate
                    that critical perspectives are being missed in editorial selection.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {computed.blindSpotCategories.map((cat) => (
                      <span
                        key={cat}
                        className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Lopsided Categories */}
          {computed.lopsidedCategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle size={16} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-300">One-Sided Coverage</h4>
                  <p className="text-xs text-[#a1a1aa] mt-1">
                    These categories have 80%+ articles with the same sentiment, suggesting
                    lack of diverse editorial perspective.
                  </p>
                  <div className="mt-3 space-y-2">
                    {computed.lopsidedCategories.map((cat) => (
                      <div
                        key={cat.category}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0f]/60 border border-[#1e1e2e]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#e4e4e7]">{cat.category}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${sentimentBg(cat.sentiment)}`}>
                            {cat.pct.toFixed(0)}% {cat.sentiment}
                          </span>
                          <span className="text-[#52525b]">({cat.total} articles)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* No bias detected */}
          {biasIndicatorCount === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={20} className="text-green-400" />
              </div>
              <p className="text-sm text-[#e4e4e7]">No significant bias patterns detected</p>
              <p className="text-xs text-[#a1a1aa] mt-1">Editorial coverage appears balanced across categories and sentiment.</p>
            </div>
          )}
        </div>
      </ChartCard>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Sentiment Lens &middot; Amar Ujala Karobar Section &middot; January 2026 &middot; {computed.total} Articles Analyzed
      </div>
    </div>
  );
}
