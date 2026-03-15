"use client";

import { useDataContext } from "@/lib/data";
import { categoryLabel, sentimentBg, impactBg, formatDate } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { Search, Filter, ChevronDown, ChevronUp, X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, Fragment } from "react";
import type { Article } from "@/lib/types";

/* ---------- Constants ---------- */

const ITEMS_PER_PAGE = 25;

const SENTIMENTS: Article["sentiment"][] = ["positive", "negative", "neutral", "mixed"];
const IMPACTS: Article["impact_level"][] = ["high", "medium", "low"];
const SIZES = ["lead", "secondary", "brief", "sidebar", "data_box", "column"];

const SIZE_BADGE: Record<string, string> = {
  lead: "bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/20",
  secondary: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  brief: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  sidebar: "bg-green-500/15 text-green-400 border-green-500/20",
  data_box: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  column: "bg-pink-500/15 text-pink-400 border-pink-500/20",
};

const CATEGORY_PALETTE = [
  "#3b82f6", "#8b5cf6", "#f5a623", "#22c55e", "#ef4444",
  "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#a855f7",
  "#14b8a6", "#f97316", "#64748b", "#e879f9", "#fb923c",
  "#4ade80", "#38bdf8", "#f87171", "#a78bfa", "#fbbf24",
];

function hashCategory(cat: string): string {
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = ((hash << 5) - hash + cat.charCodeAt(i)) | 0;
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

function sentimentBarColor(sentiment: string): string {
  switch (sentiment) {
    case "positive": return "#22c55e";
    case "negative": return "#ef4444";
    case "neutral": return "#a1a1aa";
    case "mixed": return "#f59e0b";
    default: return "#a1a1aa";
  }
}

type SortField = "date" | "category" | "sentiment_score" | "impact_level";
type SortDir = "asc" | "desc";

const IMPACT_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };

/* ---------- Main Page ---------- */

export default function ArticlesPage() {
  const { data, loading, error } = useDataContext();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSentiment, setFilterSentiment] = useState<string>("all");
  const [filterImpact, setFilterImpact] = useState<string>("all");
  const [filterSize, setFilterSize] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Table state
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const articles = data?.articles ?? [];

  const uniqueCategories = useMemo(
    () => [...new Set(articles.map((a) => a.category))].sort(),
    [articles]
  );

  // --- Filtering ---
  const filteredArticles = useMemo(() => {
    let result = [...articles];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.headline.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.headline_hindi.toLowerCase().includes(q) ||
          a.keywords.some((k) => k.toLowerCase().includes(q)) ||
          a.entities.some((e) => e.toLowerCase().includes(q))
      );
    }

    if (filterCategory !== "all") {
      result = result.filter((a) => a.category === filterCategory);
    }
    if (filterSentiment !== "all") {
      result = result.filter((a) => a.sentiment === filterSentiment);
    }
    if (filterImpact !== "all") {
      result = result.filter((a) => a.impact_level === filterImpact);
    }
    if (filterSize !== "all") {
      result = result.filter((a) => a.article_size === filterSize);
    }
    if (filterDateFrom) {
      result = result.filter((a) => a.date >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((a) => a.date <= filterDateTo);
    }

    return result;
  }, [articles, searchQuery, filterCategory, filterSentiment, filterImpact, filterSize, filterDateFrom, filterDateTo]);

  // --- Sorting ---
  const sortedArticles = useMemo(() => {
    const sorted = [...filteredArticles];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "sentiment_score":
          cmp = a.sentiment_score - b.sentiment_score;
          break;
        case "impact_level":
          cmp = (IMPACT_ORDER[a.impact_level] ?? 0) - (IMPACT_ORDER[b.impact_level] ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredArticles, sortField, sortDir]);

  // --- Stats ---
  const stats = useMemo(() => {
    if (!articles.length) return null;
    const avgScore = articles.reduce((sum, a) => sum + a.sentiment_score, 0) / articles.length;
    const filteredAvg =
      filteredArticles.length > 0
        ? filteredArticles.reduce((sum, a) => sum + a.sentiment_score, 0) / filteredArticles.length
        : 0;
    const highImpact = filteredArticles.filter((a) => a.impact_level === "high").length;
    const uniqueSectors = new Set(filteredArticles.map((a) => a.sector).filter(Boolean)).size;
    return { avgScore, filteredAvg, highImpact, uniqueSectors };
  }, [articles, filteredArticles]);

  const visibleArticles = sortedArticles.slice(0, visibleCount);
  const hasMore = visibleCount < sortedArticles.length;

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filterCategory !== "all" ||
    filterSentiment !== "all" ||
    filterImpact !== "all" ||
    filterSize !== "all" ||
    filterDateFrom !== "" ||
    filterDateTo !== "";

  const activeFilterCount = [
    filterCategory !== "all",
    filterSentiment !== "all",
    filterImpact !== "all",
    filterSize !== "all",
    filterDateFrom !== "",
    filterDateTo !== "",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterSentiment("all");
    setFilterImpact("all");
    setFilterSize("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setVisibleCount(ITEMS_PER_PAGE);
    setExpandedRow(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "date" ? "desc" : "desc");
    }
    setExpandedRow(null);
  };

  const resetAndFilter = () => {
    setVisibleCount(ITEMS_PER_PAGE);
    setExpandedRow(null);
  };

  // --- CSV Export ---
  const handleExport = () => {
    const headers = ["Date", "Headline", "Headline Hindi", "Category", "Size", "Sector", "Sentiment", "Sentiment Score", "Impact", "Keywords", "Entities", "Summary"];
    const rows = sortedArticles.map((a) => [
      a.date,
      `"${a.headline.replace(/"/g, '""')}"`,
      `"${a.headline_hindi.replace(/"/g, '""')}"`,
      a.category,
      a.article_size,
      a.sector,
      a.sentiment,
      a.sentiment_score.toFixed(3),
      a.impact_level,
      `"${a.keywords.join(", ")}"`,
      `"${a.entities.join(", ")}"`,
      `"${a.summary.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `karobar-articles${hasActiveFilters ? "-filtered" : ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- Sort icon helper ---
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={10} className="opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp size={10} className="text-[#f5a623]" />
    ) : (
      <ChevronDown size={10} className="text-[#f5a623]" />
    );
  };

  /* ---------- Loading / Error ---------- */

  if (loading) return <LoadingSkeleton />;
  if (error || !data) {
    return (
      <div className="p-8 text-red-400">
        Error loading data: {error || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* ====== Header ====== */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-[#f5a623]">Article</span>{" "}
          <span className="text-[#e4e4e7]">Explorer</span>
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          Browse and analyze all {articles.length} articles &middot; January 2026 &middot; Amar Ujala Karobar
        </p>
      </motion.div>

      {/* ====== 1. Stats Bar ====== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Articles",
            value: String(articles.length),
            sub: hasActiveFilters ? `${filteredArticles.length} matching` : "all articles",
            color: "#f5a623",
          },
          {
            label: "Avg Sentiment",
            value: stats ? stats.filteredAvg.toFixed(2) : "--",
            sub: hasActiveFilters ? "filtered avg" : "overall avg",
            color: stats && stats.filteredAvg >= 0 ? "#22c55e" : "#ef4444",
          },
          {
            label: "High Impact",
            value: stats ? String(stats.highImpact) : "--",
            sub: "in current view",
            color: "#ef4444",
          },
          {
            label: "Sectors",
            value: stats ? String(stats.uniqueSectors) : "--",
            sub: "unique sectors",
            color: "#3b82f6",
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ backgroundColor: card.color, opacity: 0.3 }} />
            <p className="text-[10px] text-[#52525b] uppercase tracking-wider">{card.label}</p>
            <p className="text-xl font-bold font-mono mt-1" style={{ color: card.color }}>
              {card.value}
            </p>
            <p className="text-[10px] text-[#a1a1aa] mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ====== 2. Filters Panel ====== */}
      <ChartCard
        title="Filters"
        subtitle={hasActiveFilters ? `${filteredArticles.length} of ${articles.length} articles` : `${articles.length} articles`}
        action={
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-[#f5a623] hover:text-[#f5a623]/80 transition-colors"
              >
                <X size={12} />
                Clear all
              </button>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#1e1e2e] text-[#a1a1aa] hover:bg-[#1e1e2e] hover:text-[#e4e4e7] transition-colors"
            >
              <Download size={12} />
              Export CSV
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                resetAndFilter();
              }}
              placeholder="Search headlines, summaries, keywords, entities, Hindi headlines..."
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg pl-10 pr-10 py-2.5 text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#f5a623]/40 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  resetAndFilter();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                showFilters
                  ? "bg-[#f5a623]/10 border-[#f5a623]/30 text-[#f5a623]"
                  : "border-[#1e1e2e] text-[#a1a1aa] hover:bg-[#1e1e2e]"
              }`}
            >
              <Filter size={12} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-[#f5a623] text-[#0a0a0f] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Active filter chips */}
            <AnimatePresence>
              {filterCategory !== "all" && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#f5a623]/20 text-[#f5a623]"
                >
                  {categoryLabel(filterCategory)}
                  <button onClick={() => { setFilterCategory("all"); resetAndFilter(); }}>
                    <X size={10} />
                  </button>
                </motion.span>
              )}
              {filterSentiment !== "all" && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#f5a623]/20 text-[#f5a623]"
                >
                  {filterSentiment.charAt(0).toUpperCase() + filterSentiment.slice(1)}
                  <button onClick={() => { setFilterSentiment("all"); resetAndFilter(); }}>
                    <X size={10} />
                  </button>
                </motion.span>
              )}
              {filterImpact !== "all" && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#f5a623]/20 text-[#f5a623]"
                >
                  {filterImpact.charAt(0).toUpperCase() + filterImpact.slice(1)} impact
                  <button onClick={() => { setFilterImpact("all"); resetAndFilter(); }}>
                    <X size={10} />
                  </button>
                </motion.span>
              )}
              {filterSize !== "all" && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#f5a623]/20 text-[#f5a623]"
                >
                  {filterSize.charAt(0).toUpperCase() + filterSize.slice(1).replace("_", " ")}
                  <button onClick={() => { setFilterSize("all"); resetAndFilter(); }}>
                    <X size={10} />
                  </button>
                </motion.span>
              )}
              {filterDateFrom && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#f5a623]/20 text-[#f5a623]"
                >
                  From: {formatDate(filterDateFrom)}
                  <button onClick={() => { setFilterDateFrom(""); resetAndFilter(); }}>
                    <X size={10} />
                  </button>
                </motion.span>
              )}
              {filterDateTo && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#f5a623]/20 text-[#f5a623]"
                >
                  To: {formatDate(filterDateTo)}
                  <button onClick={() => { setFilterDateTo(""); resetAndFilter(); }}>
                    <X size={10} />
                  </button>
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Collapsible Dropdown Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                  {/* Category */}
                  <div>
                    <label className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1 block">
                      Category
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => {
                        setFilterCategory(e.target.value);
                        resetAndFilter();
                      }}
                      className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#f5a623]/40 transition-colors appearance-none"
                    >
                      <option value="all">All ({articles.length})</option>
                      {uniqueCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {categoryLabel(cat)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sentiment */}
                  <div>
                    <label className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1 block">
                      Sentiment
                    </label>
                    <select
                      value={filterSentiment}
                      onChange={(e) => {
                        setFilterSentiment(e.target.value);
                        resetAndFilter();
                      }}
                      className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#f5a623]/40 transition-colors appearance-none"
                    >
                      <option value="all">All</option>
                      {SENTIMENTS.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Impact */}
                  <div>
                    <label className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1 block">
                      Impact
                    </label>
                    <select
                      value={filterImpact}
                      onChange={(e) => {
                        setFilterImpact(e.target.value);
                        resetAndFilter();
                      }}
                      className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#f5a623]/40 transition-colors appearance-none"
                    >
                      <option value="all">All</option>
                      {IMPACTS.map((imp) => (
                        <option key={imp} value={imp}>
                          {imp.charAt(0).toUpperCase() + imp.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Article Size */}
                  <div>
                    <label className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1 block">
                      Size
                    </label>
                    <select
                      value={filterSize}
                      onChange={(e) => {
                        setFilterSize(e.target.value);
                        resetAndFilter();
                      }}
                      className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#f5a623]/40 transition-colors appearance-none"
                    >
                      <option value="all">All</option>
                      {SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date From */}
                  <div>
                    <label className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1 block">
                      From
                    </label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => {
                        setFilterDateFrom(e.target.value);
                        resetAndFilter();
                      }}
                      className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#f5a623]/40 transition-colors [color-scheme:dark]"
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <label className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1 block">
                      To
                    </label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => {
                        setFilterDateTo(e.target.value);
                        resetAndFilter();
                      }}
                      className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#f5a623]/40 transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ChartCard>

      {/* ====== 3. Article Table ====== */}
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
        {/* Table header row */}
        <div className="px-4 py-3 border-b border-[#1e1e2e] flex items-center justify-between">
          <p className="text-sm text-[#e4e4e7] font-medium">
            {filteredArticles.length === articles.length
              ? `All ${articles.length} articles`
              : `${filteredArticles.length} of ${articles.length} articles`}
          </p>
          <p className="text-[10px] text-[#52525b]">
            Sorted by {sortField.replace("_", " ")} ({sortDir === "asc" ? "ascending" : "descending"})
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e2e]">
                <th
                  onClick={() => handleSort("date")}
                  className="text-left py-3 px-3 text-[10px] text-[#52525b] uppercase tracking-wider font-medium cursor-pointer hover:text-[#a1a1aa] transition-colors select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    Date <SortIcon field="date" />
                  </span>
                </th>
                <th className="text-left py-3 px-3 text-[10px] text-[#52525b] uppercase tracking-wider font-medium">
                  Headline
                </th>
                <th
                  onClick={() => handleSort("category")}
                  className="text-left py-3 px-3 text-[10px] text-[#52525b] uppercase tracking-wider font-medium cursor-pointer hover:text-[#a1a1aa] transition-colors select-none hidden md:table-cell"
                >
                  <span className="inline-flex items-center gap-1">
                    Category <SortIcon field="category" />
                  </span>
                </th>
                <th className="text-left py-3 px-3 text-[10px] text-[#52525b] uppercase tracking-wider font-medium hidden lg:table-cell">
                  Size
                </th>
                <th
                  onClick={() => handleSort("sentiment_score")}
                  className="text-left py-3 px-3 text-[10px] text-[#52525b] uppercase tracking-wider font-medium cursor-pointer hover:text-[#a1a1aa] transition-colors select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    Sentiment <SortIcon field="sentiment_score" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort("impact_level")}
                  className="text-left py-3 px-3 text-[10px] text-[#52525b] uppercase tracking-wider font-medium cursor-pointer hover:text-[#a1a1aa] transition-colors select-none hidden sm:table-cell"
                >
                  <span className="inline-flex items-center gap-1">
                    Impact <SortIcon field="impact_level" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleArticles.map((article, idx) => {
                const rowKey = `${article.date}-${article.headline.slice(0, 30)}-${idx}`;
                const isExpanded = expandedRow === rowKey;
                const isOdd = idx % 2 === 1;
                const catColor = hashCategory(article.category);
                const dataPointEntries = Object.entries(article.data_points || {});
                const sizeBadge = SIZE_BADGE[article.article_size] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
                // Normalize sentiment score from -1..1 to 0..100 for progress bar
                const scoreNorm = ((article.sentiment_score + 1) / 2) * 100;

                return (
                  <Fragment key={rowKey}>
                    {/* Main Row */}
                    <tr
                      onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                      className={`border-b border-[#1e1e2e]/40 cursor-pointer transition-colors ${
                        isExpanded
                          ? "bg-[#1e1e2e]/30 border-l-2 border-l-[#f5a623]"
                          : isOdd
                          ? "bg-[#12121a] hover:bg-[#1e1e2e]/50"
                          : "bg-[#0f0f17] hover:bg-[#1e1e2e]/50"
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-3 text-[#a1a1aa] text-xs whitespace-nowrap font-mono">
                        {formatDate(article.date)}
                      </td>

                      {/* Headline */}
                      <td className="py-3 px-3 text-[#e4e4e7] max-w-[400px]">
                        <div className="flex items-start gap-1.5">
                          <span className="text-[#52525b] mt-0.5 flex-shrink-0">
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </span>
                          <span className="line-clamp-2 leading-snug">{article.headline}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 hidden md:table-cell">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap border"
                          style={{
                            backgroundColor: catColor + "18",
                            color: catColor,
                            borderColor: catColor + "30",
                          }}
                        >
                          {categoryLabel(article.category)}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize whitespace-nowrap ${sizeBadge}`}>
                          {article.article_size.replace("_", " ")}
                        </span>
                      </td>

                      {/* Sentiment */}
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap capitalize ${sentimentBg(article.sentiment)}`}>
                          {article.sentiment}
                        </span>
                      </td>

                      {/* Impact */}
                      <td className="py-3 px-3 hidden sm:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap capitalize ${impactBg(article.impact_level)}`}>
                          {article.impact_level}
                        </span>
                      </td>
                    </tr>

                    {/* ====== 4. Expanded Row ====== */}
                    {isExpanded && (
                      <tr className="bg-[#0a0a0f]/80 border-l-2 border-l-[#f5a623]">
                        <td colSpan={6} className="px-4 py-5">
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                          >
                            {/* Full Headline */}
                            <div>
                              <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1">Headline</p>
                              <p className="text-sm text-[#e4e4e7] font-medium leading-relaxed">{article.headline}</p>
                            </div>

                            {/* Hindi Headline */}
                            {article.headline_hindi && (
                              <div>
                                <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1">Hindi Headline</p>
                                <p
                                  className="text-sm text-[#a1a1aa] leading-relaxed"
                                  style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                                >
                                  {article.headline_hindi}
                                </p>
                              </div>
                            )}

                            {/* Summary */}
                            <div>
                              <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1">Summary</p>
                              <p className="text-sm text-[#e4e4e7]/90 leading-relaxed">{article.summary}</p>
                            </div>

                            {/* Sector */}
                            {article.sector && (
                              <div>
                                <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1">Sector</p>
                                <p className="text-sm text-[#a1a1aa]">{article.sector}</p>
                              </div>
                            )}

                            {/* Entities + Keywords + Data Points grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Entities */}
                              {article.entities.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1.5">Entities</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {article.entities.map((e, i) => (
                                      <span
                                        key={i}
                                        className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20"
                                      >
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
                                  <div className="flex flex-wrap gap-1.5">
                                    {article.keywords.map((k, i) => (
                                      <span
                                        key={i}
                                        className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                                      >
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
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {dataPointEntries.map(([key, val]) => (
                                      <div
                                        key={key}
                                        className="flex items-baseline gap-2 text-xs bg-[#12121a] rounded-md px-2.5 py-1.5 border border-[#1e1e2e]/50"
                                      >
                                        <span className="text-[#a1a1aa] shrink-0">{key}</span>
                                        <span className="text-[#e4e4e7] font-mono ml-auto text-right">{String(val)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Sentiment Score Bar */}
                            <div>
                              <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1.5">Sentiment Score</p>
                              <div className="flex items-center gap-3">
                                <span
                                  className="text-lg font-mono font-bold"
                                  style={{ color: sentimentBarColor(article.sentiment) }}
                                >
                                  {article.sentiment_score > 0 ? "+" : ""}
                                  {article.sentiment_score.toFixed(3)}
                                </span>
                                <div className="flex-1 h-2.5 rounded-full bg-[#1e1e2e] overflow-hidden relative">
                                  {/* Center marker */}
                                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#52525b]/50 z-10" />
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${scoreNorm}%` }}
                                    transition={{ duration: 0.6 }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: sentimentBarColor(article.sentiment) }}
                                  />
                                </div>
                                <span className="text-[10px] text-[#52525b] font-mono w-8 text-right">
                                  {scoreNorm.toFixed(0)}%
                                </span>
                              </div>
                            </div>

                            {/* Mobile-only meta badges */}
                            <div className="flex flex-wrap items-center gap-2 pt-1 md:hidden">
                              <span
                                className="text-xs px-2 py-0.5 rounded-full border"
                                style={{
                                  backgroundColor: catColor + "18",
                                  color: catColor,
                                  borderColor: catColor + "30",
                                }}
                              >
                                {categoryLabel(article.category)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${sizeBadge}`}>
                                {article.article_size.replace("_", " ")}
                              </span>
                              <span className="sm:hidden">
                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${impactBg(article.impact_level)}`}>
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
          <div className="text-center py-16 px-4">
            <Search size={32} className="mx-auto mb-3 text-[#52525b]" />
            <p className="text-[#a1a1aa] text-sm">No articles match your filters.</p>
            <p className="text-[#52525b] text-xs mt-1">Try adjusting your search query or removing some filters.</p>
            <button
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 text-xs rounded-lg bg-[#f5a623]/10 text-[#f5a623] hover:bg-[#f5a623]/20 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* ====== 5. Pagination / Load More ====== */}
        {hasMore && (
          <div className="flex justify-center py-4 border-t border-[#1e1e2e]">
            <button
              onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
              className="px-6 py-2.5 text-sm rounded-lg border border-[#1e1e2e] text-[#a1a1aa] hover:bg-[#1e1e2e] hover:text-[#e4e4e7] transition-colors"
            >
              Load more &middot; {Math.min(ITEMS_PER_PAGE, sortedArticles.length - visibleCount)} next &middot;{" "}
              <span className="text-[#52525b]">{sortedArticles.length - visibleCount} remaining</span>
            </button>
          </div>
        )}

        {/* Bottom info */}
        {!hasMore && filteredArticles.length > 0 && (
          <div className="text-center py-3 border-t border-[#1e1e2e]">
            <p className="text-[10px] text-[#52525b]">
              Showing all {filteredArticles.length} articles
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Data Source: Amar Ujala Karobar Section &middot; January 2026 &middot; {articles.length} Articles
      </div>
    </div>
  );
}
