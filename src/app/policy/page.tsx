"use client";

import { useDataContext } from "@/lib/data";
import { formatDate, sentimentBg, impactBg, categoryLabel, CHART_COLORS, sentimentColor } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Shield, Building, TrendingUp, AlertCircle, FileText, Activity,
  ChevronDown, BarChart3, Landmark, Banknote, Scale, Wallet, Globe, PiggyBank,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";

/* ─── Authority badge helper ─── */
function authorityColor(auth: string): string {
  switch (auth) {
    case "RBI": return "bg-blue-500/20 text-blue-400";
    case "SEBI": return "bg-purple-500/20 text-purple-400";
    case "Government": return "bg-amber-500/20 text-amber-400";
    default: return "bg-zinc-500/20 text-zinc-400";
  }
}

function authorityDotColor(auth: string): string {
  switch (auth) {
    case "RBI": return "#3b82f6";
    case "SEBI": return "#8b5cf6";
    case "Government": return "#f5a623";
    default: return "#a1a1aa";
  }
}

/* ─── Macro indicator formatting ─── */
const MACRO_META: Record<string, { label: string; icon: React.ReactNode }> = {
  gdp: { label: "GDP Growth", icon: <TrendingUp size={18} /> },
  inflation: { label: "Inflation", icon: <Activity size={18} /> },
  trade_balance: { label: "Trade Balance", icon: <Globe size={18} /> },
  interest_rate: { label: "Interest Rate", icon: <Landmark size={18} /> },
  credit_growth: { label: "Credit Growth", icon: <Banknote size={18} /> },
  fiscal_deficit: { label: "Fiscal Deficit", icon: <Wallet size={18} /> },
  foreign_reserves: { label: "Foreign Reserves", icon: <PiggyBank size={18} /> },
};

/* ─── Custom tooltip ─── */
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

/* ─── Pie label ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPieLabel({ name, percent }: any) {
  if (percent < 0.04) return null;
  return `${name} (${(percent * 100).toFixed(0)}%)`;
}

/* ─── Sentiment score label ─── */
function sentimentLabel(score: number): { text: string; color: string } {
  if (score >= 0.3) return { text: "Positive", color: "text-green-400" };
  if (score >= 0.05) return { text: "Mildly Positive", color: "text-green-400/80" };
  if (score > -0.05) return { text: "Neutral", color: "text-zinc-400" };
  if (score > -0.3) return { text: "Mildly Negative", color: "text-red-400/80" };
  return { text: "Negative", color: "text-red-400" };
}

/* ─── PIE COLORS ─── */
const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f5a623", "#22c55e", "#ef4444", "#06b6d4", "#ec4899", "#a1a1aa"];

export default function PolicyPage() {
  const { data, loading, error } = useDataContext();
  const [showCount, setShowCount] = useState(30);

  if (loading) return <LoadingSkeleton />;
  if (error || !data) {
    return (
      <div className="p-8 flex items-center gap-3 text-red-400">
        <AlertCircle size={20} />
        <span>Error loading data: {error ?? "No data available"}</span>
      </div>
    );
  }

  const tracker = data.analyses.policy_tracker;
  const macro = data.analyses.macro_indicators;

  /* ─── Derived data ─── */
  const sortedPolicies = useMemo(
    () => [...tracker.policies].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [tracker.policies]
  );

  const weeklyData = useMemo(
    () =>
      Object.entries(tracker.policy_frequency_by_week)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, count]) => ({ week, count })),
    [tracker.policy_frequency_by_week]
  );

  const authorityPieData = useMemo(
    () =>
      Object.entries(tracker.authority_distribution)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value })),
    [tracker.authority_distribution]
  );

  /* Group policies by date for the timeline */
  const groupedByDate = useMemo(() => {
    const map = new Map<string, typeof sortedPolicies>();
    sortedPolicies.forEach((p) => {
      const existing = map.get(p.date) ?? [];
      existing.push(p);
      map.set(p.date, existing);
    });
    return Array.from(map.entries());
  }, [sortedPolicies]);

  /* Flatten for slicing */
  const flatPolicies = sortedPolicies.slice(0, showCount);
  const flatGrouped = useMemo(() => {
    const map = new Map<string, typeof sortedPolicies>();
    flatPolicies.forEach((p) => {
      const existing = map.get(p.date) ?? [];
      existing.push(p);
      map.set(p.date, existing);
    });
    return Array.from(map.entries());
  }, [flatPolicies]);

  const totalWeeklyArticles = weeklyData.reduce((s, w) => s + w.count, 0);
  const avgPerWeek = weeklyData.length > 0 ? Math.round(totalWeeklyArticles / weeklyData.length) : 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Shield size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              <span className="text-[#f5a623]">Policy</span>{" "}
              <span className="text-[#e4e4e7]">& Macro</span>
            </h1>
            <p className="text-[#a1a1aa] text-sm mt-0.5">
              Regulatory actions, government policies & macroeconomic indicators
            </p>
          </div>
        </div>
      </motion.div>

      {/* ────────── Section 1: Policy Overview Stats ────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Policy Articles */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 hover:border-[#2e2e3e] transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-[#a1a1aa]" />
            <span className="text-[#a1a1aa] text-xs font-medium">Total Policy Articles</span>
          </div>
          <p className="font-mono text-2xl font-bold text-[#e4e4e7]">{tracker.total_policy_articles}</p>
        </motion.div>

        {/* Most Active Regulator */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 hover:border-[#2e2e3e] transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Building size={16} className="text-[#a1a1aa]" />
            <span className="text-[#a1a1aa] text-xs font-medium">Most Active Regulator</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-sm font-semibold ${authorityColor(tracker.most_active_regulator)}`}>
              {tracker.most_active_regulator}
            </span>
            <span className="text-[#a1a1aa] text-xs">
              ({tracker.authority_distribution[tracker.most_active_regulator] ?? "?"} articles)
            </span>
          </div>
        </motion.div>

        {/* Weeks Tracked */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 hover:border-[#2e2e3e] transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-[#a1a1aa]" />
            <span className="text-[#a1a1aa] text-xs font-medium">Weeks Tracked</span>
          </div>
          <p className="font-mono text-2xl font-bold text-[#e4e4e7]">{weeklyData.length}</p>
          <p className="text-[#a1a1aa] text-xs mt-0.5">Avg {avgPerWeek} articles/week</p>
        </motion.div>

        {/* Authorities Count */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 hover:border-[#2e2e3e] transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Scale size={16} className="text-[#a1a1aa]" />
            <span className="text-[#a1a1aa] text-xs font-medium">Authorities Tracked</span>
          </div>
          <p className="font-mono text-2xl font-bold text-[#e4e4e7]">{authorityPieData.length}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {authorityPieData.slice(0, 4).map(({ name }) => (
              <span key={name} className={`text-[10px] px-1.5 py-0.5 rounded ${authorityColor(name)}`}>
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ────────── Section 2: Weekly Frequency Bar + Authority Pie ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Frequency */}
        <ChartCard title="Policy Frequency by Week" subtitle="Number of policy articles per week">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <XAxis
                dataKey="week"
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Articles" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Authority Distribution Pie */}
        <ChartCard title="Authority Distribution" subtitle="Policy articles by regulatory body">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={authorityPieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={renderPieLabel}
                labelLine={{ stroke: "#a1a1aa", strokeWidth: 0.5 }}
              >
                {authorityPieData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={authorityDotColor(entry.name) !== "#a1a1aa" ? authorityDotColor(entry.name) : PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #2e2e3e", borderRadius: "8px" }}
                itemStyle={{ color: "#e4e4e7" }}
                labelStyle={{ color: "#a1a1aa" }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend below */}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {authorityPieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: authorityDotColor(entry.name) !== "#a1a1aa" ? authorityDotColor(entry.name) : PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ────────── Section 3: Policy Timeline ────────── */}
      <ChartCard
        title="Policy Timeline"
        subtitle={`${tracker.total_policy_articles} policy articles sorted by date`}
        action={
          <span className="text-xs text-[#a1a1aa]">
            Showing {Math.min(showCount, sortedPolicies.length)} of {sortedPolicies.length}
          </span>
        }
      >
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-2.5 top-0 bottom-0 w-px bg-[#1e1e2e]" />

          <AnimatePresence>
            {flatGrouped.map(([date, policies], gi) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: gi * 0.02 }}
                className="mb-6 relative"
              >
                {/* Date dot */}
                <div className="absolute -left-[14px] top-1 w-3 h-3 rounded-full bg-[#f5a623] border-2 border-[#0a0a0f]" />

                {/* Date label */}
                <p className="text-xs font-semibold text-[#f5a623] mb-2">{formatDate(date)}</p>

                {/* Policies for this date */}
                <div className="space-y-2">
                  {policies.map((policy, pi) => (
                    <div
                      key={`${date}-${pi}`}
                      className="bg-[#0a0a0f]/60 border border-[#1e1e2e]/50 rounded-lg p-3 hover:border-[#2e2e3e] transition-colors"
                    >
                      {/* Top row: headline */}
                      <p className="text-sm text-[#e4e4e7] font-medium leading-snug mb-2">
                        {policy.headline}
                      </p>

                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {/* Authority badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${authorityColor(policy.authority)}`}>
                          {policy.authority}
                        </span>

                        {/* Impact level badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium capitalize ${impactBg(policy.impact_level)}`}>
                          {policy.impact_level} impact
                        </span>

                        {/* Sentiment badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium capitalize ${sentimentBg(policy.sentiment)}`}>
                          {policy.sentiment}
                        </span>

                        {/* Category */}
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-400">
                          {categoryLabel(policy.category)}
                        </span>
                      </div>

                      {/* Summary */}
                      {policy.summary && (
                        <p className="text-xs text-[#a1a1aa] leading-relaxed line-clamp-2">
                          {policy.summary}
                        </p>
                      )}

                      {/* Affected sectors */}
                      {policy.affected_sectors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {policy.affected_sectors.map((sector) => (
                            <span key={sector} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e2e] text-[#a1a1aa]">
                              {sector}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Show more / Show less */}
          {sortedPolicies.length > 30 && (
            <div className="flex justify-center pt-2">
              {showCount < sortedPolicies.length ? (
                <button
                  onClick={() => setShowCount((c) => Math.min(c + 30, sortedPolicies.length))}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs text-[#f5a623] hover:text-[#f5a623]/80 bg-[#f5a623]/5 hover:bg-[#f5a623]/10 rounded-lg transition-colors"
                >
                  <ChevronDown size={14} />
                  Show more ({sortedPolicies.length - showCount} remaining)
                </button>
              ) : (
                <button
                  onClick={() => setShowCount(30)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs text-[#a1a1aa] hover:text-[#e4e4e7] bg-[#1e1e2e]/50 rounded-lg transition-colors"
                >
                  Collapse
                </button>
              )}
            </div>
          )}
        </div>
      </ChartCard>

      {/* ────────── Section 4: Macro Dashboard ────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-[#f5a623]" />
          <h2 className="text-lg font-bold text-[#e4e4e7]">Macro Indicators</h2>
          <span className="text-xs text-[#a1a1aa]">({Object.keys(macro).length} tracked)</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(macro).map(([key, indicator], i) => {
          const meta = MACRO_META[key] ?? { label: categoryLabel(key), icon: <Activity size={18} /> };
          const sentInfo = sentimentLabel(indicator.avg_sentiment);
          const firstArticle = indicator.articles[0];
          const dataPoints = firstArticle?.data_points ? Object.entries(firstArticle.data_points).slice(0, 3) : [];

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.04 }}
              className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 hover:border-[#2e2e3e] transition-colors flex flex-col"
            >
              {/* Indicator header */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-md bg-[#1e1e2e]">
                  <span className="text-[#f5a623]">{meta.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#e4e4e7] truncate">{meta.label}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#a1a1aa]">{indicator.mention_count} mentions</span>
                    <span className="text-[10px] text-[#a1a1aa]">&middot;</span>
                    <span className={`text-[10px] font-medium ${sentInfo.color}`}>
                      {sentInfo.text} ({indicator.avg_sentiment.toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Sentiment bar */}
              <div className="w-full h-1 rounded-full bg-[#1e1e2e] mb-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(5, ((indicator.avg_sentiment + 1) / 2) * 100)}%`,
                    backgroundColor: sentimentColor(
                      indicator.avg_sentiment >= 0.05 ? "positive" : indicator.avg_sentiment <= -0.05 ? "negative" : "neutral"
                    ),
                  }}
                />
              </div>

              {/* Key data points */}
              {dataPoints.length > 0 && (
                <div className="space-y-1 mb-3">
                  {dataPoints.map(([dpKey, dpValue]) => (
                    <div key={dpKey} className="flex items-center justify-between text-[11px]">
                      <span className="text-[#a1a1aa] truncate mr-2">{categoryLabel(dpKey)}</span>
                      <span className="text-[#e4e4e7] font-mono font-medium shrink-0">
                        {typeof dpValue === "number" ? dpValue.toLocaleString("en-IN") : String(dpValue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Article headlines */}
              <div className="mt-auto pt-2 border-t border-[#1e1e2e] space-y-1.5">
                {indicator.articles.slice(0, 3).map((article, ai) => (
                  <div key={ai} className="flex gap-2 items-start">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: sentimentColor(article.sentiment) }}
                    />
                    <p className="text-[11px] text-[#a1a1aa] leading-snug line-clamp-2">
                      {article.headline}
                    </p>
                  </div>
                ))}
                {indicator.articles.length > 3 && (
                  <p className="text-[10px] text-[#a1a1aa]/60 pl-3.5">
                    +{indicator.articles.length - 3} more articles
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Policy & Macro data derived from {tracker.total_policy_articles} policy articles &middot; {Object.keys(macro).length} macro indicators tracked
      </div>
    </div>
  );
}
