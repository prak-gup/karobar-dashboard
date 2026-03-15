"use client";

import { useDataContext } from "@/lib/data";
import { formatINR, formatPercent, formatDate, CHART_COLORS } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Activity, DollarSign,
  Gem, ArrowUpDown, Calendar, Trophy, AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

/* ───────────────────── Tooltip ───────────────────── */

function CustomTooltip({
  active,
  payload,
  label,
}: {
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
          {p.name}: {formatINR(p.value)}
        </p>
      ))}
    </div>
  );
}

function PercentTooltip({
  active,
  payload,
  label,
}: {
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
          {p.name}: {p.value.toFixed(2)}
        </p>
      ))}
    </div>
  );
}

function RatioTooltip({
  active,
  payload,
  label,
}: {
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
          {p.name}: {p.value.toFixed(1)}x
        </p>
      ))}
    </div>
  );
}

/* ───────────────────── Stat Cell ───────────────────── */

function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[#0a0a0f] rounded-lg p-3">
      <p className="text-xs text-[#a1a1aa]">{label}</p>
      <p className={`font-mono text-sm font-bold ${accent ? "text-[#f5a623]" : "text-[#e4e4e7]"}`}>
        {value}
      </p>
    </div>
  );
}

function StatCellColored({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#0a0a0f] rounded-lg p-3">
      <p className="text-xs text-[#a1a1aa]">{label}</p>
      <p className="font-mono text-sm font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

/* ───────────────────── Page ───────────────────── */

export default function MarketDeepDivePage() {
  const { data, loading, error } = useDataContext();
  const [indexView, setIndexView] = useState<"both" | "sensex" | "nifty">("both");
  const [metalView, setMetalView] = useState<"both" | "gold" | "silver">("both");

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return <div className="p-8 text-red-400">Error: {error}</div>;

  const { time_series } = data.dashboard_charts;
  const { market_trends, precious_metals, currency, seasonality } = data.analyses;
  const sensex = market_trends.sensex;
  const nifty = market_trends.nifty;
  const gold = precious_metals.gold;
  const silver = precious_metals.silver;

  /* ── Chart Data ── */

  const marketData = time_series.sensex_daily.map((s, i) => ({
    date: formatDate(s.date),
    Sensex: s.value,
    Nifty: time_series.nifty_daily[i]?.value,
  }));

  const metalCombined = time_series.gold_daily.map((g, i) => ({
    date: formatDate(g.date),
    Gold: g.value,
    Silver: time_series.silver_daily[i]?.value ?? 0,
  }));

  const ratioEntries = Object.entries(precious_metals.gold_silver_ratio).sort(
    ([a], [b]) => a.localeCompare(b)
  );
  const ratioData = ratioEntries.map(([date, ratio]) => ({
    date: formatDate(date),
    Ratio: ratio,
  }));

  const currencyData = time_series.usd_inr_daily.map((c) => ({
    date: formatDate(c.date),
    "USD/INR": c.value,
  }));

  const weekdayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const seasonalityData = weekdayOrder
    .filter((day) => seasonality.day_of_week_returns[day])
    .map((day) => {
      const d = seasonality.day_of_week_returns[day];
      return {
        day,
        "Avg Change (pts)": d.avg_change_pts,
        "Win %": d.winning_pct,
        tradingDays: d.trading_days,
        totalChange: d.total_change_pts,
        fill:
          day === seasonality.best_weekday
            ? "#22c55e"
            : day === seasonality.worst_weekday
            ? "#ef4444"
            : "#3b82f6",
      };
    });

  /* ── Helpers ── */

  const changeColor = (v: number) => (v >= 0 ? "#22c55e" : "#ef4444");
  const changeIcon = (v: number) =>
    v >= 0 ? <TrendingUp size={14} className="text-green-400" /> : <TrendingDown size={14} className="text-red-400" />;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#3b82f6]/10 rounded-lg">
            <Activity size={22} className="text-[#3b82f6]" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#e4e4e7]">Market Deep Dive</h1>
            <p className="text-[#a1a1aa] text-sm mt-0.5">
              Indices, Commodities, Currency &amp; Seasonality &mdash; January 2026
            </p>
          </div>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════
          SECTION 1: SENSEX & NIFTY
         ════════════════════════════════════════════════ */}

      <ChartCard
        title="Sensex & Nifty Analysis"
        subtitle="BSE Sensex & NSE Nifty 50 — Daily Close"
        action={
          <div className="flex gap-1">
            {(["both", "sensex", "nifty"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setIndexView(opt)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  indexView === opt
                    ? "bg-[#3b82f6]/20 text-[#3b82f6]"
                    : "text-[#a1a1aa] hover:bg-[#1e1e2e]"
                }`}
              >
                {opt === "both" ? "Both" : opt === "sensex" ? "Sensex" : "Nifty"}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
          {/* Chart */}
          <div>
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={marketData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="sensexGradMarket" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.sensex} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.sensex} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="niftyGradMarket" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.nifty} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.nifty} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis
                  yAxisId="sensex"
                  domain={["auto", "auto"]}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  hide={indexView === "nifty"}
                  tickFormatter={(v: number) => formatINR(v, true)}
                />
                <YAxis
                  yAxisId="nifty"
                  orientation="right"
                  domain={["auto", "auto"]}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  hide={indexView === "sensex"}
                  tickFormatter={(v: number) => formatINR(v, true)}
                />
                <Tooltip content={<CustomTooltip />} />
                {indexView !== "nifty" && (
                  <Area
                    yAxisId="sensex"
                    type="monotone"
                    dataKey="Sensex"
                    stroke={CHART_COLORS.sensex}
                    fill="url(#sensexGradMarket)"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {indexView !== "sensex" && (
                  <Area
                    yAxisId="nifty"
                    type="monotone"
                    dataKey="Nifty"
                    stroke={CHART_COLORS.nifty}
                    fill="url(#niftyGradMarket)"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Panel */}
          <div className="space-y-4">
            {/* Sensex Stats */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS.sensex }} />
                <span className="text-xs font-semibold text-[#e4e4e7] uppercase tracking-wider">Sensex</span>
                <span className="ml-auto flex items-center gap-1">
                  {changeIcon(sensex.total_change_pct)}
                  <span className="text-xs font-mono font-bold" style={{ color: changeColor(sensex.total_change_pct) }}>
                    {formatPercent(sensex.total_change_pct)}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatCell label="Start" value={formatINR(sensex.start_value)} />
                <StatCell label="End" value={formatINR(sensex.end_value)} />
                <StatCellColored
                  label={`Best Day (${formatDate(sensex.best_day.date)})`}
                  value={`+${formatINR(sensex.best_day.change)} → ${formatINR(sensex.best_day.close)}`}
                  color="#22c55e"
                />
                <StatCellColored
                  label={`Worst Day (${formatDate(sensex.worst_day.date)})`}
                  value={`${formatINR(sensex.worst_day.change)} → ${formatINR(sensex.worst_day.close)}`}
                  color="#ef4444"
                />
                <StatCell label="Volatility (Std Dev)" value={`${sensex.volatility_pct_stddev.toFixed(2)}%`} />
                <StatCell label="Avg Daily Change" value={`${sensex.avg_daily_change_pts.toFixed(1)} pts`} />
                <StatCellColored
                  label="Winning Days"
                  value={`${sensex.winning_days} / ${sensex.total_trading_days}`}
                  color="#22c55e"
                />
                <StatCellColored
                  label="Losing Days"
                  value={`${sensex.losing_days} / ${sensex.total_trading_days}`}
                  color="#ef4444"
                />
              </div>
            </div>

            {/* Nifty Stats */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS.nifty }} />
                <span className="text-xs font-semibold text-[#e4e4e7] uppercase tracking-wider">Nifty 50</span>
                <span className="ml-auto flex items-center gap-1">
                  {changeIcon(nifty.total_change_pct)}
                  <span className="text-xs font-mono font-bold" style={{ color: changeColor(nifty.total_change_pct) }}>
                    {formatPercent(nifty.total_change_pct)}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatCell label="Start" value={formatINR(nifty.start_value)} />
                <StatCell label="End" value={formatINR(nifty.end_value)} />
                <StatCellColored
                  label={`Best Day (${formatDate(nifty.best_day.date)})`}
                  value={`+${formatINR(nifty.best_day.change)} → ${formatINR(nifty.best_day.close)}`}
                  color="#22c55e"
                />
                <StatCellColored
                  label={`Worst Day (${formatDate(nifty.worst_day.date)})`}
                  value={`${formatINR(nifty.worst_day.change)} → ${formatINR(nifty.worst_day.close)}`}
                  color="#ef4444"
                />
                <StatCell label="Volatility (Std Dev)" value={`${nifty.volatility_pct_stddev.toFixed(2)}%`} />
                <StatCell label="Avg Daily Change" value={`${nifty.avg_daily_change_pts.toFixed(1)} pts`} />
                <StatCellColored
                  label="Winning Days"
                  value={`${nifty.winning_days} / ${nifty.total_trading_days}`}
                  color="#22c55e"
                />
                <StatCellColored
                  label="Losing Days"
                  value={`${nifty.losing_days} / ${nifty.total_trading_days}`}
                  color="#ef4444"
                />
              </div>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* ════════════════════════════════════════════════
          SECTION 2: PRECIOUS METALS
         ════════════════════════════════════════════════ */}

      <ChartCard
        title="Precious Metals"
        subtitle="Gold (per 10g) & Silver (per kg) — Daily Price"
        action={
          <div className="flex gap-1">
            {(["both", "gold", "silver"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setMetalView(opt)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  metalView === opt
                    ? "bg-[#f5a623]/20 text-[#f5a623]"
                    : "text-[#a1a1aa] hover:bg-[#1e1e2e]"
                }`}
              >
                {opt === "both" ? "Both" : opt === "gold" ? "Gold" : "Silver"}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
          {/* Chart */}
          <div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={metalCombined}
                margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
              >
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="silverGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.silver} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.silver} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                {metalView !== "silver" && (
                  <YAxis
                    yAxisId="gold"
                    domain={["auto", "auto"]}
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickFormatter={(v: number) => formatINR(v, true)}
                  />
                )}
                {metalView === "both" ? (
                  <YAxis
                    yAxisId="silver"
                    orientation="right"
                    domain={["auto", "auto"]}
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickFormatter={(v: number) => formatINR(v, true)}
                  />
                ) : metalView === "silver" ? (
                  <YAxis
                    yAxisId="silver"
                    domain={["auto", "auto"]}
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickFormatter={(v: number) => formatINR(v, true)}
                  />
                ) : null}
                <Tooltip content={<CustomTooltip />} />
                {metalView !== "silver" && (
                  <Area
                    yAxisId="gold"
                    type="monotone"
                    dataKey="Gold"
                    stroke={CHART_COLORS.gold}
                    fill="url(#goldGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {metalView !== "gold" && (
                  <Area
                    yAxisId="silver"
                    type="monotone"
                    dataKey="Silver"
                    stroke={CHART_COLORS.silver}
                    fill="url(#silverGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Panel */}
          <div className="space-y-4">
            {/* Gold Stats */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Gem size={14} className="text-[#f5a623]" />
                <span className="text-xs font-semibold text-[#e4e4e7] uppercase tracking-wider">Gold (per 10g)</span>
                <span className="ml-auto flex items-center gap-1">
                  {changeIcon(gold.period_return_pct)}
                  <span className="text-xs font-mono font-bold" style={{ color: changeColor(gold.period_return_pct) }}>
                    {formatPercent(gold.period_return_pct)}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatCell label="Start Price" value={`Rs ${formatINR(gold.start_price)}`} />
                <StatCell label="End Price" value={`Rs ${formatINR(gold.end_price)}`} />
                <StatCell label="Min" value={`Rs ${formatINR(gold.min_price)}`} />
                <StatCell label="Max" value={`Rs ${formatINR(gold.max_price)}`} />
                <StatCell label="Average" value={`Rs ${formatINR(gold.avg_price)}`} accent />
                <StatCell label="Volatility" value={`${gold.volatility_pct.toFixed(2)}%`} />
              </div>
            </div>

            {/* Silver Stats */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Gem size={14} className="text-[#94a3b8]" />
                <span className="text-xs font-semibold text-[#e4e4e7] uppercase tracking-wider">Silver (per kg)</span>
                <span className="ml-auto flex items-center gap-1">
                  {changeIcon(silver.period_return_pct)}
                  <span className="text-xs font-mono font-bold" style={{ color: changeColor(silver.period_return_pct) }}>
                    {formatPercent(silver.period_return_pct)}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatCell label="Start Price" value={`Rs ${formatINR(silver.start_price)}`} />
                <StatCell label="End Price" value={`Rs ${formatINR(silver.end_price)}`} />
                <StatCell label="Min" value={`Rs ${formatINR(silver.min_price)}`} />
                <StatCell label="Max" value={`Rs ${formatINR(silver.max_price)}`} />
                <StatCell label="Average" value={`Rs ${formatINR(silver.avg_price)}`} accent />
                <StatCell label="Volatility" value={`${silver.volatility_pct.toFixed(2)}%`} />
              </div>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Gold-Silver Ratio */}
      {ratioData.length > 0 && (
        <ChartCard
          title="Gold-Silver Ratio"
          subtitle="How many kg of silver to buy 10g of gold — lower ratio means silver is relatively expensive"
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ratioData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis domain={["auto", "auto"]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip content={<RatioTooltip />} />
              <Line
                type="monotone"
                dataKey="Ratio"
                stroke="#c084fc"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 3"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <StatCell
              label="Start Ratio"
              value={`${ratioEntries[0]?.[1]?.toFixed(1) ?? "N/A"}x`}
            />
            <StatCell
              label="End Ratio"
              value={`${ratioEntries[ratioEntries.length - 1]?.[1]?.toFixed(1) ?? "N/A"}x`}
            />
            <StatCell
              label="Gold-Equity Correlation"
              value={precious_metals.gold_equity_correlation.toFixed(3)}
              accent
            />
          </div>
        </ChartCard>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 3: CURRENCY (USD/INR)
         ════════════════════════════════════════════════ */}

      <ChartCard
        title="Currency — USD/INR"
        subtitle="Indian Rupee exchange rate through January 2026"
      >
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
          {/* Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={currencyData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="currGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="USD/INR"
                  stroke="#f97316"
                  fill="url(#currGrad)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Panel */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={14} className="text-[#f97316]" />
              <span className="text-xs font-semibold text-[#e4e4e7] uppercase tracking-wider">
                Rupee Overview
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatCell label="Start Rate" value={`Rs ${currency.start_rate.toFixed(2)}`} />
              <StatCell label="End Rate" value={`Rs ${currency.end_rate.toFixed(2)}`} />
              <StatCellColored
                label="Period Change"
                value={`${currency.period_change >= 0 ? "+" : ""}${currency.period_change.toFixed(2)}`}
                color={currency.period_change >= 0 ? "#ef4444" : "#22c55e"}
              />
              <StatCellColored
                label="Depreciation"
                value={`${currency.depreciation_pct.toFixed(2)}%`}
                color={currency.depreciation_pct > 0 ? "#ef4444" : "#22c55e"}
              />
              <StatCell label="Max Rate" value={`Rs ${currency.max_rate.toFixed(2)}`} />
              <StatCell label="Min Rate" value={`Rs ${currency.min_rate.toFixed(2)}`} />
              <StatCell label="Average" value={`Rs ${currency.avg_rate.toFixed(2)}`} accent />
              <StatCell label="Volatility" value={currency.volatility.toFixed(4)} />
            </div>
            <div className="mt-3 p-3 bg-[#0a0a0f] rounded-lg border border-[#1e1e2e]/50">
              <div className="flex items-start gap-2">
                <ArrowUpDown size={14} className="text-[#f97316] mt-0.5 shrink-0" />
                <p className="text-xs text-[#a1a1aa] leading-relaxed">
                  The Rupee{" "}
                  {currency.depreciation_pct > 0 ? "depreciated" : "appreciated"} by{" "}
                  <span className="text-[#e4e4e7] font-medium">
                    {Math.abs(currency.depreciation_pct).toFixed(2)}%
                  </span>{" "}
                  against the US Dollar during the period, moving from{" "}
                  <span className="font-mono text-[#e4e4e7]">{currency.start_rate.toFixed(2)}</span> to{" "}
                  <span className="font-mono text-[#e4e4e7]">{currency.end_rate.toFixed(2)}</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* ════════════════════════════════════════════════
          SECTION 4: SEASONALITY
         ════════════════════════════════════════════════ */}

      <ChartCard
        title="Weekday Seasonality"
        subtitle="Average Sensex movement by day of week — January 2026"
      >
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
          {/* Chart */}
          <div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={seasonalityData}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="day"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  width={75}
                />
                <Tooltip content={<PercentTooltip />} />
                <Bar dataKey="Avg Change (pts)" radius={[0, 4, 4, 0]}>
                  {seasonalityData.map((entry, idx) => (
                    <rect key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats + Callout */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} className="text-[#3b82f6]" />
              <span className="text-xs font-semibold text-[#e4e4e7] uppercase tracking-wider">
                Day-of-Week Stats
              </span>
            </div>

            {/* Best Day */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-green-500/5 border border-green-500/20"
            >
              <Trophy size={16} className="text-green-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-green-400 font-semibold">Best Day: {seasonality.best_weekday}</p>
                {seasonality.day_of_week_returns[seasonality.best_weekday] && (
                  <p className="text-xs text-[#a1a1aa] mt-0.5">
                    Avg{" "}
                    <span className="text-green-400 font-mono">
                      {seasonality.day_of_week_returns[seasonality.best_weekday].avg_change_pts > 0 ? "+" : ""}
                      {seasonality.day_of_week_returns[seasonality.best_weekday].avg_change_pts.toFixed(1)} pts
                    </span>{" "}
                    &middot; Win rate{" "}
                    <span className="text-green-400 font-mono">
                      {seasonality.day_of_week_returns[seasonality.best_weekday].winning_pct.toFixed(0)}%
                    </span>
                  </p>
                )}
              </div>
            </motion.div>

            {/* Worst Day */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/5 border border-red-500/20"
            >
              <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-red-400 font-semibold">Worst Day: {seasonality.worst_weekday}</p>
                {seasonality.day_of_week_returns[seasonality.worst_weekday] && (
                  <p className="text-xs text-[#a1a1aa] mt-0.5">
                    Avg{" "}
                    <span className="text-red-400 font-mono">
                      {seasonality.day_of_week_returns[seasonality.worst_weekday].avg_change_pts > 0 ? "+" : ""}
                      {seasonality.day_of_week_returns[seasonality.worst_weekday].avg_change_pts.toFixed(1)} pts
                    </span>{" "}
                    &middot; Win rate{" "}
                    <span className="text-red-400 font-mono">
                      {seasonality.day_of_week_returns[seasonality.worst_weekday].winning_pct.toFixed(0)}%
                    </span>
                  </p>
                )}
              </div>
            </motion.div>

            {/* Full table */}
            <div className="space-y-1.5 mt-2">
              {seasonalityData.map((d) => (
                <div
                  key={d.day}
                  className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-[#0a0a0f]"
                >
                  <span className="text-[#a1a1aa]">{d.day}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono" style={{ color: d.fill }}>
                      {d["Avg Change (pts)"] > 0 ? "+" : ""}
                      {d["Avg Change (pts)"].toFixed(1)} pts
                    </span>
                    <span className="text-[#a1a1aa] font-mono">
                      {d["Win %"].toFixed(0)}% win
                    </span>
                    <span className="text-[#a1a1aa]/60 font-mono text-[10px]">
                      {d.tradingDays}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Data Source: Amar Ujala Karobar Section &middot; January 2026 &middot;{" "}
        {data.metadata.total_articles_extracted} Articles from {data.metadata.total_pdfs_processed} Pages
      </div>
    </div>
  );
}
