"use client";

import { useDataContext } from "@/lib/data";
import { formatDate, sentimentColor, sentimentBg, impactBg, categoryLabel, CHART_COLORS } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  ComposedChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Search, Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, Fragment } from "react";
import type { Article } from "@/lib/types";

const CATEGORY_COLORS = [
  "#3b82f6", "#8b5cf6", "#f5a623", "#22c55e", "#ef4444",
  "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#a855f7",
  "#14b8a6", "#f97316",
];

const ITEMS_PER_PAGE = 20;

/* ---------- Tooltip Components ---------- */

function SentimentTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-[#a1a1aa] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-mono font-medium" style={{ color: p.color }}>
          {p.name}: {p.dataKey === "articles" ? p.value : p.value.toFixed(2)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { label: string; value: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm text-[#e4e4e7] font-medium">{categoryLabel(d.payload.label)}</p>
      <p className="text-xs text-[#a1a1aa]">{d.payload.value} articles</p>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function SentimentPage() {
  const { data, loading, error } = useDataContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSentiment, setFilterSentiment] = useState<string>("all");
  const [filterImpact, setFilterImpact] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showFilters, setShowFilters] = useState(false);
  const [pieCategory, setPieCategory] = useState<string | null>(null);

  const articles = data?.articles ?? [];

  const activeCategory = pieCategory ?? (filterCategory !== "all" ? filterCategory : null);

  const uniqueCategories = useMemo(() => [...new Set(articles.map((a) => a.category))].sort(), [articles]);

  const filteredArticles = useMemo(() => {
    let result = [...articles];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.headline.toLowerCase().includes(q) ||
          a.headline_hindi.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.keywords.some((k) => k.toLowerCase().includes(q)) ||
          a.entities.some((e) => e.toLowerCase().includes(q))
      );
    }

    if (activeCategory) {
      result = result.filter((a) => a.category === activeCategory);
    }

    if (filterSentiment !== "all") {
      result = result.filter((a) => a.sentiment === filterSentiment);
    }

    if (filterImpact !== "all") {
      result = result.filter((a) => a.impact_level === filterImpact);
    }

    return result;
  }, [articles, searchQuery, activeCategory, filterSentiment, filterImpact]);

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return <div className="p-8 text-red-400">Error: {error}</div>;

  const { time_series, distributions } = data.dashboard_charts;
  const sentimentByCategory = data.analyses.sentiment.sentiment_by_category;

  /* ---------- Chart Data ---------- */

  const timelineData = time_series.sentiment_daily.map((s, i) => ({
    date: formatDate(s.date),
    sentiment: s.value,
    articles: time_series.article_count_daily[i]?.value ?? 0,
  }));

  const sentDist = distributions.sentiment_distribution;
  const sentimentCards: { key: string; count: number; color: string }[] = [
    { key: "positive", count: sentDist.positive ?? 0, color: CHART_COLORS.positive },
    { key: "negative", count: sentDist.negative ?? 0, color: CHART_COLORS.negative },
    { key: "neutral", count: sentDist.neutral ?? 0, color: CHART_COLORS.neutral },
    { key: "mixed", count: sentDist.mixed ?? 0, color: CHART_COLORS.mixed },
  ];
  const totalSentiment = sentimentCards.reduce((a, b) => a + b.count, 0);

  const sentByCatData = Object.entries(sentimentByCategory)
    .map(([cat, avg]) => ({ category: categoryLabel(cat), raw: cat, avg: Number(avg) }))
    .sort((a, b) => b.avg - a.avg);

  const uniqueSentiments: Article["sentiment"][] = ["positive", "negative", "neutral", "mixed"];
  const uniqueImpacts: Article["impact_level"][] = ["high", "medium", "low"];

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArticles.length;

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterSentiment("all");
    setFilterImpact("all");
    setPieCategory(null);
    setVisibleCount(ITEMS_PER_PAGE);
    setExpandedRow(null);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filterCategory !== "all" ||
    filterSentiment !== "all" ||
    filterImpact !== "all" ||
    pieCategory !== null;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-[#f5a623]">News</span>{" "}
          <span className="text-[#e4e4e7]">& Sentiment</span>
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          Sentiment analysis across {articles.length} articles &middot; January 2026
        </p>
      </motion.div>

      {/* ====== 1. Sentiment Timeline ====== */}
      <ChartCard
        title="Sentiment Timeline"
        subtitle="Daily avg sentiment score (line) and article volume (bars)"
      >
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={timelineData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <YAxis
              yAxisId="sentiment"
              domain={[-1, 1]}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              label={{ value: "Sentiment", angle: -90, position: "insideLeft", fill: "#a1a1aa", fontSize: 10 }}
            />
            <YAxis
              yAxisId="articles"
              orientation="right"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              label={{ value: "Articles", angle: 90, position: "insideRight", fill: "#a1a1aa", fontSize: 10 }}
            />
            <Tooltip content={<SentimentTooltip />} />
            <Bar yAxisId="articles" dataKey="articles" fill="#3b82f6" opacity={0.3} radius={[2, 2, 0, 0]} name="Articles" />
            <Line
              yAxisId="sentiment"
              type="monotone"
              dataKey="sentiment"
              stroke={CHART_COLORS.positive}
              strokeWidth={2.5}
              dot={{ r: 3, fill: CHART_COLORS.positive }}
              activeDot={{ r: 5 }}
              name="Sentiment"
            />
            <Legend />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ====== 2. Sentiment Distribution ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sentimentCards.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 relative overflow-hidden"
          >
            {/* Background accent bar */}
            <div
              className="absolute bottom-0 left-0 h-1 rounded-b-xl transition-all"
              style={{
                backgroundColor: s.color,
                width: totalSentiment > 0 ? `${(s.count / totalSentiment) * 100}%` : "0%",
              }}
            />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-[#a1a1aa] capitalize">{s.key}</span>
            </div>
            <p className="text-2xl font-bold text-[#e4e4e7] font-mono">{s.count}</p>
            <p className="text-xs text-[#a1a1aa] mt-1">
              {totalSentiment > 0 ? ((s.count / totalSentiment) * 100).toFixed(1) : 0}%
            </p>
          </motion.div>
        ))}
      </div>

      {/* ====== 3. Category Distribution + 4. Sentiment by Category ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Pie */}
        <ChartCard
          title="Category Distribution"
          subtitle="Click a category to filter articles below"
          action={
            pieCategory ? (
              <button
                onClick={() => { setPieCategory(null); setVisibleCount(ITEMS_PER_PAGE); }}
                className="flex items-center gap-1 text-xs text-[#f5a623] hover:text-[#f5a623]/80 transition-colors"
              >
                <X size={12} />
                Clear: {categoryLabel(pieCategory)}
              </button>
            ) : null
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={distributions.category_pie}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                dataKey="value"
                nameKey="label"
                paddingAngle={2}
                cursor="pointer"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(entry: any) => {
                  const cat = (entry.label ?? entry.name) as string;
                  if (pieCategory === cat) {
                    setPieCategory(null);
                  } else {
                    setPieCategory(cat);
                    setFilterCategory("all");
                    setVisibleCount(ITEMS_PER_PAGE);
                    setExpandedRow(null);
                  }
                }}
              >
                {distributions.category_pie.map((entry, idx) => (
                  <Cell
                    key={entry.label}
                    fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                    opacity={pieCategory && pieCategory !== entry.label ? 0.3 : 1}
                    stroke={pieCategory === entry.label ? "#fff" : "none"}
                    strokeWidth={pieCategory === entry.label ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
            {distributions.category_pie.map((entry, idx) => (
              <button
                key={entry.label}
                onClick={() => {
                  if (pieCategory === entry.label) {
                    setPieCategory(null);
                  } else {
                    setPieCategory(entry.label);
                    setFilterCategory("all");
                    setVisibleCount(ITEMS_PER_PAGE);
                    setExpandedRow(null);
                  }
                }}
                className={`flex items-center gap-1.5 text-xs transition-opacity ${
                  pieCategory && pieCategory !== entry.label ? "opacity-40" : "opacity-100"
                } hover:opacity-100`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                />
                <span className="text-[#a1a1aa]">{categoryLabel(entry.label)}</span>
                <span className="text-[#52525b]">({entry.value})</span>
              </button>
            ))}
          </div>
        </ChartCard>

        {/* Sentiment by Category - Horizontal Bar */}
        <ChartCard
          title="Sentiment by Category"
          subtitle="Average sentiment score per category"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sentByCatData}
              layout="vertical"
              margin={{ top: 5, right: 30, bottom: 5, left: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
              <XAxis
                type="number"
                domain={[-1, 1]}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={120}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { category: string; avg: number };
                  return (
                    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
                      <p className="text-sm text-[#e4e4e7] font-medium">{d.category}</p>
                      <p className="text-xs font-mono" style={{ color: d.avg >= 0 ? "#22c55e" : "#ef4444" }}>
                        Avg Sentiment: {d.avg.toFixed(3)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                {sentByCatData.map((entry, idx) => {
                  // Gradient from red (negative) through yellow (neutral) to green (positive)
                  const ratio = (entry.avg + 1) / 2; // 0..1
                  const r = Math.round(239 - ratio * (239 - 34));
                  const g = Math.round(68 + ratio * (197 - 68));
                  const b = Math.round(68 + ratio * (94 - 68));
                  return <Cell key={idx} fill={`rgb(${r},${g},${b})`} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-[10px] text-[#ef4444]">Negative</span>
            <div className="w-32 h-2 rounded-full bg-gradient-to-r from-[#ef4444] via-[#f59e0b] to-[#22c55e]" />
            <span className="text-[10px] text-[#22c55e]">Positive</span>
          </div>
        </ChartCard>
      </div>

      {/* ====== 5. Article Explorer ====== */}
      <ChartCard
        title="Article Explorer"
        subtitle={`${filteredArticles.length} of ${articles.length} articles${hasActiveFilters ? " (filtered)" : ""}`}
        action={
          hasActiveFilters ? (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-[#f5a623] hover:text-[#f5a623]/80 transition-colors"
            >
              <X size={12} />
              Clear all filters
            </button>
          ) : null
        }
      >
        {/* Search and Filters */}
        <div className="space-y-3 mb-4">
          {/* Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(ITEMS_PER_PAGE); setExpandedRow(null); }}
              placeholder="Search headlines, summaries, keywords, entities..."
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg pl-10 pr-10 py-2.5 text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setVisibleCount(ITEMS_PER_PAGE); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Toggle + Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                showFilters
                  ? "bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]"
                  : "border-[#1e1e2e] text-[#a1a1aa] hover:bg-[#1e1e2e]"
              }`}
            >
              <Filter size={12} />
              Filters
              {hasActiveFilters && (
                <span className="bg-[#f5a623] text-[#0a0a0f] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {[filterCategory !== "all", filterSentiment !== "all", filterImpact !== "all", pieCategory !== null].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Active filter chips */}
            {pieCategory && (
              <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                Category: {categoryLabel(pieCategory)}
                <button onClick={() => { setPieCategory(null); setVisibleCount(ITEMS_PER_PAGE); }}>
                  <X size={10} />
                </button>
              </span>
            )}
            {filterCategory !== "all" && !pieCategory && (
              <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20">
                Category: {categoryLabel(filterCategory)}
                <button onClick={() => { setFilterCategory("all"); setVisibleCount(ITEMS_PER_PAGE); }}>
                  <X size={10} />
                </button>
              </span>
            )}
            {filterSentiment !== "all" && (
              <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md ${sentimentBg(filterSentiment)} border border-current/20`}>
                Sentiment: {filterSentiment}
                <button onClick={() => { setFilterSentiment("all"); setVisibleCount(ITEMS_PER_PAGE); }}>
                  <X size={10} />
                </button>
              </span>
            )}
            {filterImpact !== "all" && (
              <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md ${impactBg(filterImpact)} border border-current/20`}>
                Impact: {filterImpact}
                <button onClick={() => { setFilterImpact("all"); setVisibleCount(ITEMS_PER_PAGE); }}>
                  <X size={10} />
                </button>
              </span>
            )}
          </div>

          {/* Filter Dropdowns */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Category */}
                  <div>
                    <label className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1 block">Category</label>
                    <select
                      value={pieCategory ?? filterCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPieCategory(null);
                        setFilterCategory(val);
                        setVisibleCount(ITEMS_PER_PAGE);
                        setExpandedRow(null);
                      }}
                      className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]/50 transition-colors appearance-none"
                    >
                      <option value="all">All Categories</option>
                      {uniqueCategories.map((cat) => (
                        <option key={cat} value={cat}>{categoryLabel(cat)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sentiment */}
                  <div>
                    <label className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1 block">Sentiment</label>
                    <select
                      value={filterSentiment}
                      onChange={(e) => { setFilterSentiment(e.target.value); setVisibleCount(ITEMS_PER_PAGE); setExpandedRow(null); }}
                      className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]/50 transition-colors appearance-none"
                    >
                      <option value="all">All Sentiments</option>
                      {uniqueSentiments.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Impact */}
                  <div>
                    <label className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1 block">Impact Level</label>
                    <select
                      value={filterImpact}
                      onChange={(e) => { setFilterImpact(e.target.value); setVisibleCount(ITEMS_PER_PAGE); setExpandedRow(null); }}
                      className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]/50 transition-colors appearance-none"
                    >
                      <option value="all">All Levels</option>
                      {uniqueImpacts.map((imp) => (
                        <option key={imp} value={imp}>{imp.charAt(0).toUpperCase() + imp.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Article Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e2e]">
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium">Date</th>
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium">Headline</th>
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium hidden md:table-cell">Category</th>
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium hidden lg:table-cell">Sector</th>
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium">Sentiment</th>
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium hidden sm:table-cell">Impact</th>
                <th className="text-left py-2.5 px-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium hidden lg:table-cell">Size</th>
              </tr>
            </thead>
            <tbody>
              {visibleArticles.map((article, idx) => {
                const isExpanded = expandedRow === idx;
                const dataPointEntries = Object.entries(article.data_points || {});

                return (
                  <Fragment key={`${article.date}-${idx}`}>
                    {/* Main Row */}
                    <tr
                      onClick={() => setExpandedRow(isExpanded ? null : idx)}
                      className={`border-b border-[#1e1e2e]/50 cursor-pointer transition-colors ${
                        isExpanded ? "bg-[#1e1e2e]/30" : "hover:bg-[#1e1e2e]/20"
                      }`}
                    >
                      <td className="py-2.5 px-2 text-[#a1a1aa] text-xs whitespace-nowrap font-mono">
                        {formatDate(article.date)}
                      </td>
                      <td className="py-2.5 px-2 text-[#e4e4e7] max-w-[300px]">
                        <div className="flex items-start gap-1.5">
                          <span className="text-[#52525b] mt-0.5 flex-shrink-0">
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </span>
                          <span className="line-clamp-1">{article.headline}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 hidden md:table-cell">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] whitespace-nowrap">
                          {categoryLabel(article.category)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[#a1a1aa] text-xs hidden lg:table-cell whitespace-nowrap">
                        {article.sector || "--"}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${sentimentBg(article.sentiment)} whitespace-nowrap`}>
                          {article.sentiment}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 hidden sm:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${impactBg(article.impact_level)} whitespace-nowrap capitalize`}>
                          {article.impact_level}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[#a1a1aa] text-xs hidden lg:table-cell capitalize">
                        {article.article_size}
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr className="bg-[#0a0a0f]/60">
                        <td colSpan={7} className="px-4 py-4">
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            {/* Summary */}
                            <div>
                              <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1">Summary</p>
                              <p className="text-sm text-[#e4e4e7]/90 leading-relaxed">{article.summary}</p>
                            </div>

                            {/* Hindi Headline */}
                            {article.headline_hindi && (
                              <div>
                                <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1">Hindi Headline</p>
                                <p className="text-sm text-[#a1a1aa]">{article.headline_hindi}</p>
                              </div>
                            )}

                            {/* Meta Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {/* Entities */}
                              {article.entities.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1.5">Entities</p>
                                  <div className="flex flex-wrap gap-1">
                                    {article.entities.map((e, i) => (
                                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]">
                                        {e}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Keywords */}
                              {article.keywords.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1.5">Keywords</p>
                                  <div className="flex flex-wrap gap-1">
                                    {article.keywords.map((k, i) => (
                                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#06b6d4]/10 text-[#06b6d4]">
                                        {k}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Data Points */}
                              {dataPointEntries.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1.5">Data Points</p>
                                  <div className="space-y-1">
                                    {dataPointEntries.map(([key, val]) => (
                                      <div key={key} className="flex items-baseline gap-2 text-xs">
                                        <span className="text-[#a1a1aa]">{key}:</span>
                                        <span className="text-[#e4e4e7] font-mono">{String(val)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Score row */}
                            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                              <span className="text-[#52525b]">
                                Score:{" "}
                                <span className="font-mono" style={{ color: sentimentColor(article.sentiment) }}>
                                  {article.sentiment_score.toFixed(2)}
                                </span>
                              </span>
                              <span className="text-[#52525b]">
                                Sector: <span className="text-[#a1a1aa]">{article.sector || "N/A"}</span>
                              </span>
                              <span className="text-[#52525b]">
                                Size: <span className="text-[#a1a1aa] capitalize">{article.article_size}</span>
                              </span>
                              {/* Badges visible on mobile in expanded view */}
                              <span className="md:hidden">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#3b82f6]/10 text-[#3b82f6]">
                                  {categoryLabel(article.category)}
                                </span>
                              </span>
                              <span className="sm:hidden">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${impactBg(article.impact_level)} capitalize`}>
                                  {article.impact_level}
                                </span>
                              </span>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#52525b] text-sm">No articles match your filters.</p>
            <button
              onClick={clearAllFilters}
              className="mt-2 text-xs text-[#f5a623] hover:text-[#f5a623]/80 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
              className="px-6 py-2 text-sm rounded-lg border border-[#1e1e2e] text-[#a1a1aa] hover:bg-[#1e1e2e] hover:text-[#e4e4e7] transition-colors"
            >
              Load more ({Math.min(ITEMS_PER_PAGE, filteredArticles.length - visibleCount)} of {filteredArticles.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </ChartCard>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Data Source: Amar Ujala Karobar Section &middot; January 2026 &middot; {articles.length} Articles Analyzed
      </div>
    </div>
  );
}
