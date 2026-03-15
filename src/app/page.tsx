"use client";

import { useDataContext } from "@/lib/data";
import { categoryLabel, sentimentColor, CHART_COLORS } from "@/lib/utils";
import KpiCard from "@/components/ui/KpiCard";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Newspaper, FileText, Star, TrendingUp, TrendingDown, Scale,
  Users, Layers, ChevronDown, ChevronUp, Target, BarChart3, Bookmark,
} from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f5a623", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#a855f7", "#14b8a6", "#f97316", "#64748b", "#e879f9", "#fb923c", "#4ade80", "#38bdf8", "#f87171", "#a78bfa", "#fbbf24"];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
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

export default function NewsroomOverview() {
  const { data, loading, error } = useDataContext();
  const [expandedSummary, setExpandedSummary] = useState(false);

  const stats = useMemo(() => {
    if (!data) return null;
    const articles = data.articles;
    const sizes: Record<string, number> = {};
    const cats: Record<string, number> = {};
    const sentiments: Record<string, number> = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    const impacts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    const daily: Record<string, number> = {};

    articles.forEach((a) => {
      sizes[a.article_size] = (sizes[a.article_size] || 0) + 1;
      cats[a.category] = (cats[a.category] || 0) + 1;
      sentiments[a.sentiment] = (sentiments[a.sentiment] || 0) + 1;
      impacts[a.impact_level] = (impacts[a.impact_level] || 0) + 1;
      daily[a.date] = (daily[a.date] || 0) + 1;
    });

    const counts = Object.values(daily);
    const uniqueCategories = Object.keys(cats).length;
    const leadCount = sizes["lead"] || 0;
    const avgDaily = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);
    const posRatio = ((sentiments.positive / articles.length) * 100).toFixed(0);
    const negRatio = ((sentiments.negative / articles.length) * 100).toFixed(0);
    const highImpact = impacts.high;

    // Daily chart data
    const dailyChart = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        Articles: count,
      }));

    // Category pie
    const categoryPie = Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .map(([label, value]) => ({ label: categoryLabel(label), value }));

    // Article size data
    const sizeData = Object.entries(sizes)
      .sort(([, a], [, b]) => b - a)
      .map(([label, value]) => ({ name: label.charAt(0).toUpperCase() + label.slice(1).replace("_", " "), value }));

    // Sentiment donut
    const sentDonut = Object.entries(sentiments).map(([k, v]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      value: v,
      color: sentimentColor(k),
    }));

    return {
      total: articles.length,
      leadCount,
      avgDaily,
      uniqueCategories,
      posRatio,
      negRatio,
      highImpact,
      minDaily: Math.min(...counts),
      maxDaily: Math.max(...counts),
      publishingDays: counts.length,
      dailyChart,
      categoryPie,
      sizeData,
      sentDonut,
      sentiments,
      impacts,
    };
  }, [data]);

  if (loading) return <LoadingSkeleton />;
  if (error || !data || !stats) return <div className="p-8 text-red-400">Error: {error}</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-[#f5a623]">Karobar</span>{" "}
          <span className="text-[#e4e4e7]">Editorial Intelligence</span>
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          January 2026 &middot; Amar Ujala Business Section &middot; {data.metadata.total_pdfs_processed} Pages Analyzed &middot; {stats.total} Articles Extracted
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-6 lg:gap-3">
        <KpiCard label="Total Articles" value={String(stats.total)} icon={<Newspaper size={16} />} delay={0} />
        <KpiCard label="Lead Stories" value={String(stats.leadCount)} color="gold" icon={<Star size={16} />} delay={0.05} />
        <KpiCard label="Avg/Day" value={stats.avgDaily} icon={<BarChart3 size={16} />} delay={0.1} />
        <KpiCard label="Categories" value={String(stats.uniqueCategories)} icon={<Layers size={16} />} delay={0.15} />
        <KpiCard label="Positive" value={`${stats.posRatio}%`} color="green" icon={<TrendingUp size={16} />} delay={0.2} />
        <KpiCard label="High Impact" value={String(stats.highImpact)} color="red" icon={<Target size={16} />} delay={0.25} />
      </div>

      {/* Daily Output Chart */}
      <ChartCard title="Daily Publishing Output" subtitle={`${stats.publishingDays} publishing days — min ${stats.minDaily}, max ${stats.maxDaily} articles/day`}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.dailyChart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 10 }} interval={1} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="Articles" fill="#f5a623" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Two Column: Category Pie + Sentiment + Article Type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Distribution */}
        <ChartCard title="Content Categories" subtitle={`${stats.uniqueCategories} categories across ${stats.total} articles`}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.categoryPie}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={100}
                dataKey="value"
                nameKey="label"
                paddingAngle={1}
              >
                {stats.categoryPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #2e2e3e", borderRadius: "8px" }}
                itemStyle={{ color: "#e4e4e7" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {stats.categoryPie.slice(0, 8).map((cat, i) => (
              <div key={cat.label} className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                <span className="truncate">{cat.label}</span>
                <span className="font-mono text-[#e4e4e7] ml-auto">{cat.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Article Placement */}
        <ChartCard title="Story Placement" subtitle="How articles are positioned on the page">
          <div className="space-y-3 mt-2">
            {stats.sizeData.map((s, i) => {
              const pct = (s.value / stats.total) * 100;
              const colors = ["#f5a623", "#3b82f6", "#8b5cf6", "#22c55e", "#ef4444", "#a1a1aa"];
              return (
                <motion.div key={s.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#e4e4e7]">{s.name}</span>
                    <span className="font-mono text-[#a1a1aa]">{s.value} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#0a0a0f] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: colors[i % colors.length] }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
          <p className="text-xs text-[#a1a1aa] mt-4">
            <span className="text-[#f5a623] font-medium">Lead</span> = front-page main story &middot; <span className="text-[#3b82f6] font-medium">Secondary</span> = supporting story &middot; <span className="text-[#8b5cf6] font-medium">Brief</span> = short update
          </p>
        </ChartCard>

        {/* Sentiment Balance */}
        <ChartCard title="Sentiment Balance" subtitle="Editorial tone across all coverage">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.sentDonut}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
              >
                {stats.sentDonut.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #2e2e3e", borderRadius: "8px" }}
                itemStyle={{ color: "#e4e4e7" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {stats.sentDonut.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[#a1a1aa]">{s.name}</span>
                <span className="font-mono text-[#e4e4e7] ml-auto">{s.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
            <p className="text-xs text-[#a1a1aa]">
              <span className="text-green-400 font-medium">{stats.posRatio}% positive</span> vs{" "}
              <span className="text-red-400 font-medium">{stats.negRatio}% negative</span> — a{" "}
              {Number(stats.posRatio) > 60 ? "strongly optimistic" : Number(stats.posRatio) > 50 ? "mildly optimistic" : "balanced"} editorial lean
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Impact Distribution */}
      <ChartCard title="Story Impact Distribution" subtitle="Editor's assessment of article significance">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "High Impact", count: stats.impacts.high, color: "#ef4444", desc: "Front-page worthy, market-moving" },
            { label: "Medium Impact", count: stats.impacts.medium, color: "#f59e0b", desc: "Important but not breaking" },
            { label: "Low Impact", count: stats.impacts.low, color: "#3b82f6", desc: "Updates, briefs, routine" },
          ].map((item) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center p-4 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]"
            >
              <p className="font-mono text-3xl font-bold" style={{ color: item.color }}>{item.count}</p>
              <p className="text-sm text-[#e4e4e7] mt-1">{item.label}</p>
              <p className="text-xs text-[#a1a1aa] mt-0.5">{item.desc}</p>
              <div className="mt-2 h-1.5 rounded-full bg-[#1e1e2e] overflow-hidden">
                <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${(item.count / stats.total) * 100}%` }} />
              </div>
            </motion.div>
          ))}
        </div>
      </ChartCard>

      {/* Key Insights */}
      <ChartCard title="Editorial Insights" subtitle={`${data.key_insights.length} patterns identified`}>
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
      <ChartCard title="Month Summary">
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
        Data Source: Amar Ujala Karobar Section &middot; January 2026 &middot; {stats.total} Articles from {data.metadata.total_pdfs_processed} Pages
      </div>
    </div>
  );
}
