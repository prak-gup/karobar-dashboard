"use client";

import { useDataContext } from "@/lib/data";
import { formatINR, formatDate, CHART_COLORS } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, ComposedChart, Area,
} from "recharts";
import {
  TrendingDown, TrendingUp, ArrowRightLeft, Activity,
  Calendar, BarChart3, GitCompareArrows, CircleDot, Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */

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
          {p.name}: {formatINR(p.value)} Cr
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Mini-Card (reusable within sections)                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  sub,
  color = "#e4e4e7",
  icon,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="bg-[#0a0a0f]/60 border border-[#1e1e2e] rounded-lg p-3 flex flex-col gap-1"
    >
      <div className="flex items-center gap-1.5 text-[#a1a1aa] text-xs">
        {icon}
        {label}
      </div>
      <p className="text-lg font-mono font-semibold" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-[#a1a1aa]">{sub}</p>}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Correlation Gauge                                                  */
/* ------------------------------------------------------------------ */

function CorrelationGauge({
  label,
  value,
  interpretation,
  pairedDays,
}: {
  label: string;
  value: number;
  interpretation: string;
  pairedDays: number;
}) {
  // Map correlation from [-1, 1] to [0, 100] for the bar width
  const pct = Math.abs(value) * 100;
  const barColor =
    Math.abs(value) < 0.3
      ? "#a1a1aa"
      : value > 0
        ? CHART_COLORS.dii
        : CHART_COLORS.fii;

  return (
    <div className="bg-[#0a0a0f]/60 border border-[#1e1e2e] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-[#e4e4e7] font-medium">{label}</p>
        <span className="text-xs font-mono text-[#a1a1aa]">{pairedDays} days</span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <span
          className="text-2xl font-mono font-bold"
          style={{ color: barColor }}
        >
          {value > 0 ? "+" : ""}
          {value.toFixed(4)}
        </span>
      </div>
      {/* Gauge bar */}
      <div className="w-full h-2 bg-[#1e1e2e] rounded-full overflow-hidden mb-1.5">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
        />
      </div>
      <p className="text-xs text-[#a1a1aa]">{interpretation}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Calendar Cell                                                      */
/* ------------------------------------------------------------------ */

function CalendarCell({
  day,
  fiiType,
  diiType,
  fiiAmount,
  diiAmount,
  hasData,
}: {
  day: number | null;
  fiiType: string | null;
  diiType: string | null;
  fiiAmount: number | null;
  diiAmount: number | null;
  hasData: boolean;
}) {
  if (day === null) {
    return <div className="aspect-square" />;
  }

  let bgClass = "bg-[#1e1e2e]/40"; // no data — grey
  let borderClass = "border-[#1e1e2e]";
  let label = "No data";

  if (hasData && fiiType && diiType) {
    if (fiiType === "buy" && diiType === "buy") {
      bgClass = "bg-green-500/15";
      borderClass = "border-green-500/30";
      label = "Both buying";
    } else if (fiiType === "sell" && diiType === "sell") {
      bgClass = "bg-red-500/15";
      borderClass = "border-red-500/30";
      label = "Both selling";
    } else if (fiiType === "sell" && diiType === "buy") {
      bgClass = "bg-gradient-to-br from-red-500/15 to-green-500/15";
      borderClass = "border-orange-500/30";
      label = "FII sell / DII buy";
    } else if (fiiType === "buy" && diiType === "sell") {
      bgClass = "bg-gradient-to-br from-green-500/15 to-red-500/15";
      borderClass = "border-amber-500/30";
      label = "FII buy / DII sell";
    }
  } else if (hasData && (fiiType || diiType)) {
    // Partial data
    if (fiiType === "sell" || diiType === "sell") {
      bgClass = "bg-red-500/10";
      borderClass = "border-red-500/20";
    } else {
      bgClass = "bg-green-500/10";
      borderClass = "border-green-500/20";
    }
    label = fiiType ? `FII ${fiiType}` : `DII ${diiType}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: day * 0.015 }}
      className={`aspect-square ${bgClass} border ${borderClass} rounded-lg flex flex-col items-center justify-center gap-0.5 relative group cursor-default`}
    >
      <span className="text-xs font-mono text-[#e4e4e7] font-medium">{day}</span>
      {hasData && (fiiType || diiType) && (
        <div className="flex gap-0.5">
          {fiiType && (
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: fiiType === "buy" ? CHART_COLORS.dii : CHART_COLORS.fii }}
            />
          )}
          {diiType && (
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: diiType === "buy" ? CHART_COLORS.dii : CHART_COLORS.fii }}
            />
          )}
        </div>
      )}
      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
        <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl whitespace-nowrap text-left">
          <p className="text-xs text-[#a1a1aa] mb-1">Jan {day} &middot; {label}</p>
          {fiiAmount !== null && (
            <p className="text-xs font-mono" style={{ color: CHART_COLORS.fii }}>
              FII: {formatINR(fiiAmount)} Cr
            </p>
          )}
          {diiAmount !== null && (
            <p className="text-xs font-mono" style={{ color: CHART_COLORS.dii }}>
              DII: {formatINR(diiAmount)} Cr
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function FlowsPage() {
  const { data, loading, error } = useDataContext();

  /* ---- Derived data ---- */
  const chartData = useMemo(() => {
    if (!data) return { flowBars: [], calendarDays: [] as Array<{ day: number | null; fiiType: string | null; diiType: string | null; fiiAmount: number | null; diiAmount: number | null; hasData: boolean }> };

    const ts = data.dashboard_charts.time_series;

    // Build merged FII + DII bar data with cumulative line
    const fiiMap = new Map(ts.fii_daily.map((f) => [f.date, f.value]));
    const diiMap = new Map(ts.dii_daily.map((d) => [d.date, d.value]));
    const allDates = [
      ...new Set([...ts.fii_daily.map((f) => f.date), ...ts.dii_daily.map((d) => d.date)]),
    ].sort();

    let cumFII = 0;
    let cumDII = 0;
    const flowBars = allDates.map((date) => {
      const fii = fiiMap.get(date) ?? 0;
      const dii = diiMap.get(date) ?? 0;
      cumFII += fii;
      cumDII += dii;
      return {
        date: formatDate(date),
        rawDate: date,
        FII: fii,
        DII: dii,
        "Cum. FII": Math.round(cumFII),
        "Cum. DII": Math.round(cumDII),
      };
    });

    // Build calendar data for January 2026
    // Jan 1, 2026 is Thursday (index 3 in Mon-based week)
    const dailyMap = new Map(
      data.daily_market_data.map((d) => [d.date, d])
    );

    // Determine the day-of-week offset for Jan 1 (0=Mon ... 6=Sun)
    const jan1 = new Date(2026, 0, 1);
    const startOffset = (jan1.getDay() + 6) % 7; // Convert Sun=0 to Mon=0

    type CalendarDay = {
      day: number | null;
      fiiType: string | null;
      diiType: string | null;
      fiiAmount: number | null;
      diiAmount: number | null;
      hasData: boolean;
    };

    const calendarDays: CalendarDay[] = [];
    // Padding for start of month
    for (let i = 0; i < startOffset; i++) {
      calendarDays.push({ day: null, fiiType: null, diiType: null, fiiAmount: null, diiAmount: null, hasData: false });
    }
    // Actual days
    for (let d = 1; d <= 31; d++) {
      const dateStr = `2026-01-${String(d).padStart(2, "0")}`;
      const dayData = dailyMap.get(dateStr);
      const fiiAct = dayData?.market?.fii_activity;
      const diiAct = dayData?.market?.dii_activity;
      calendarDays.push({
        day: d,
        fiiType: fiiAct?.type ?? null,
        diiType: diiAct?.type ?? null,
        fiiAmount: fiiAct?.amount_crore ?? null,
        diiAmount: diiAct?.amount_crore ?? null,
        hasData: !!dayData,
      });
    }

    return { flowBars, calendarDays };
  }, [data]);

  /* ---- Loading / error ---- */
  if (loading) return <LoadingSkeleton />;
  if (error || !data) return <div className="p-8 text-red-400">Error: {error}</div>;

  const flows = data.analyses.institutional_flows;
  const fii = flows.fii;
  const dii = flows.dii;
  const crossCutting = data.analyses.cross_cutting;

  // Correlation data
  const fiiCorr = flows.fii_market_correlation;
  const fiiRupee = crossCutting.fii_vs_rupee;
  const goldEquity = crossCutting.gold_vs_equity;

  // Divergence info
  const divergenceCount = flows.divergence_count;
  const divergenceDays = flows.fii_dii_divergence_days;

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#e4e4e7] flex items-center gap-3">
          <ArrowRightLeft className="text-[#f5a623]" size={28} />
          Flows &amp; Institutions
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          FII &amp; DII activity breakdown &middot; January 2026 &middot; Divergence analysis &amp; cross-asset correlations
        </p>
      </motion.div>

      {/* ============================================================ */}
      {/*  Section 1: Summary Stats                                     */}
      {/* ============================================================ */}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Net FII Flow"
          value={`${formatINR(fii.total_net_crore)} Cr`}
          sub={`${fii.total_buy_days} buy / ${fii.total_sell_days} sell days`}
          color={fii.total_net_crore >= 0 ? CHART_COLORS.dii : CHART_COLORS.fii}
          icon={<TrendingDown size={12} />}
          delay={0}
        />
        <StatCard
          label="Net DII Flow"
          value={`+${formatINR(dii.total_net_crore)} Cr`}
          sub={`${dii.total_buy_days} buy / ${dii.total_sell_days} sell days`}
          color={CHART_COLORS.dii}
          icon={<TrendingUp size={12} />}
          delay={0.05}
        />
        <StatCard
          label="FII Avg Daily"
          value={`${formatINR(Math.round(fii.avg_daily_flow_crore))} Cr`}
          sub={`${fii.data_points} data points`}
          color={fii.avg_daily_flow_crore >= 0 ? CHART_COLORS.dii : CHART_COLORS.fii}
          icon={<Activity size={12} />}
          delay={0.1}
        />
        <StatCard
          label="DII Avg Daily"
          value={`+${formatINR(Math.round(dii.avg_daily_flow_crore))} Cr`}
          sub={`${dii.data_points} data points`}
          color={CHART_COLORS.dii}
          icon={<Activity size={12} />}
          delay={0.15}
        />
        <StatCard
          label="FII Biggest Sell"
          value={`${formatINR(fii.biggest_sell_day.amount_crore)} Cr`}
          sub={formatDate(fii.biggest_sell_day.date)}
          color={CHART_COLORS.fii}
          icon={<BarChart3 size={12} />}
          delay={0.2}
        />
        <StatCard
          label="Divergence Days"
          value={String(divergenceCount)}
          sub="FII & DII opposite sides"
          color="#f59e0b"
          icon={<GitCompareArrows size={12} />}
          delay={0.25}
        />
      </div>

      {/* ============================================================ */}
      {/*  Section 2: FII/DII Flow Chart (Composed bar + cumulative)   */}
      {/* ============================================================ */}

      <ChartCard
        title="FII vs DII — Daily Flows & Cumulative Trend"
        subtitle="Bar: daily net flow (Cr) | Line: running cumulative total"
      >
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart
            data={chartData.flowBars}
            margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
          >
            <defs>
              <linearGradient id="cumFIIGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.fii} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.fii} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cumDIIGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.dii} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.dii} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              axisLine={{ stroke: "#1e1e2e" }}
            />
            <YAxis
              yAxisId="daily"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              axisLine={{ stroke: "#1e1e2e" }}
              tickFormatter={(v: number) => formatINR(v, true)}
            />
            <YAxis
              yAxisId="cumulative"
              orientation="right"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              axisLine={{ stroke: "#1e1e2e" }}
              tickFormatter={(v: number) => formatINR(v, true)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="daily" dataKey="FII" fill={CHART_COLORS.fii} radius={[2, 2, 0, 0]} opacity={0.85} />
            <Bar yAxisId="daily" dataKey="DII" fill={CHART_COLORS.dii} radius={[2, 2, 0, 0]} opacity={0.85} />
            <Area
              yAxisId="cumulative"
              type="monotone"
              dataKey="Cum. FII"
              stroke={CHART_COLORS.fii}
              fill="url(#cumFIIGrad)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
            />
            <Area
              yAxisId="cumulative"
              type="monotone"
              dataKey="Cum. DII"
              stroke={CHART_COLORS.dii}
              fill="url(#cumDIIGrad)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Biggest day callouts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#1e1e2e]">
          <div className="text-center">
            <p className="text-[10px] text-[#a1a1aa] uppercase tracking-wider mb-1">FII Biggest Buy</p>
            <p className="text-sm font-mono font-semibold text-[#22c55e]">
              +{formatINR(fii.biggest_buy_day.amount_crore)} Cr
            </p>
            <p className="text-[10px] text-[#a1a1aa]">{formatDate(fii.biggest_buy_day.date)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#a1a1aa] uppercase tracking-wider mb-1">FII Biggest Sell</p>
            <p className="text-sm font-mono font-semibold text-[#ef4444]">
              {formatINR(fii.biggest_sell_day.amount_crore)} Cr
            </p>
            <p className="text-[10px] text-[#a1a1aa]">{formatDate(fii.biggest_sell_day.date)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#a1a1aa] uppercase tracking-wider mb-1">DII Biggest Buy</p>
            <p className="text-sm font-mono font-semibold text-[#22c55e]">
              +{formatINR(dii.biggest_buy_day.amount_crore)} Cr
            </p>
            <p className="text-[10px] text-[#a1a1aa]">{formatDate(dii.biggest_buy_day.date)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#a1a1aa] uppercase tracking-wider mb-1">DII Biggest Sell</p>
            <p className="text-sm font-mono font-semibold text-[#ef4444]">
              {formatINR(dii.biggest_sell_day.amount_crore)} Cr
            </p>
            <p className="text-[10px] text-[#a1a1aa]">{formatDate(dii.biggest_sell_day.date)}</p>
          </div>
        </div>
      </ChartCard>

      {/* ============================================================ */}
      {/*  Section 3: Divergence Calendar                               */}
      {/* ============================================================ */}

      <ChartCard
        title="Divergence Calendar — January 2026"
        subtitle={`${divergenceCount} days where FII and DII took opposite positions`}
        action={
          <div className="flex items-center gap-3 text-[10px] text-[#a1a1aa]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500/30 border border-green-500/40" />
              Both buy
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/30 border border-red-500/40" />
              Both sell
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-red-500/30 to-green-500/30 border border-orange-500/40" />
              Divergence
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1e1e2e]/60 border border-[#1e1e2e]" />
              No data
            </span>
          </div>
        }
      >
        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-[10px] text-[#a1a1aa] font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {chartData.calendarDays.map((cell, i) => (
            <CalendarCell
              key={i}
              day={cell.day}
              fiiType={cell.fiiType}
              diiType={cell.diiType}
              fiiAmount={cell.fiiAmount}
              diiAmount={cell.diiAmount}
              hasData={cell.hasData}
            />
          ))}
        </div>

        {/* Notable divergence days */}
        {Array.isArray(divergenceDays) && divergenceDays.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#1e1e2e]">
            <p className="text-xs text-[#a1a1aa] mb-2 flex items-center gap-1.5">
              <Info size={12} /> Top divergence days (FII selling while DII buying)
            </p>
            <div className="flex flex-wrap gap-2">
              {divergenceDays
                .filter((d) => d.fii_action === "sell" && d.dii_action === "buy")
                .sort((a, b) => Math.abs(b.fii_crore) - Math.abs(a.fii_crore))
                .slice(0, 5)
                .map((d) => (
                  <div
                    key={d.date}
                    className="bg-[#0a0a0f]/60 border border-orange-500/20 rounded-lg px-3 py-2 text-xs"
                  >
                    <span className="text-[#e4e4e7] font-medium">{formatDate(d.date)}</span>
                    <span className="mx-1.5 text-[#a1a1aa]">&middot;</span>
                    <span className="font-mono text-[#ef4444]">FII {formatINR(d.fii_crore)} Cr</span>
                    <span className="mx-1.5 text-[#a1a1aa]">&middot;</span>
                    <span className="font-mono text-[#22c55e]">DII +{formatINR(d.dii_crore)} Cr</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </ChartCard>

      {/* ============================================================ */}
      {/*  Section 4: Cumulative Flow Comparison (line chart)           */}
      {/* ============================================================ */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="FII Cumulative Flow"
          subtitle="Running total of FII net flows (Cr)"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={chartData.flowBars}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                tickFormatter={(v: number) => formatINR(v, true)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="Cum. FII"
                stroke={CHART_COLORS.fii}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.fii, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 text-center">
            <span className="text-xs text-[#a1a1aa]">Total: </span>
            <span
              className="text-sm font-mono font-semibold"
              style={{ color: fii.total_net_crore >= 0 ? CHART_COLORS.dii : CHART_COLORS.fii }}
            >
              {formatINR(fii.total_net_crore)} Cr
            </span>
          </div>
        </ChartCard>

        <ChartCard
          title="DII Cumulative Flow"
          subtitle="Running total of DII net flows (Cr)"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={chartData.flowBars}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                tickFormatter={(v: number) => formatINR(v, true)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="Cum. DII"
                stroke={CHART_COLORS.dii}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.dii, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 text-center">
            <span className="text-xs text-[#a1a1aa]">Total: </span>
            <span className="text-sm font-mono font-semibold" style={{ color: CHART_COLORS.dii }}>
              +{formatINR(dii.total_net_crore)} Cr
            </span>
          </div>
        </ChartCard>
      </div>

      {/* ============================================================ */}
      {/*  Section 5: Correlation Panel                                 */}
      {/* ============================================================ */}

      <ChartCard
        title="Cross-Asset Correlations"
        subtitle="Pearson correlation coefficients for January 2026"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CorrelationGauge
            label="FII Flow vs Market Return"
            value={fiiCorr.pearson_r}
            interpretation={fiiCorr.interpretation}
            pairedDays={fiiCorr.paired_days}
          />
          <CorrelationGauge
            label="FII Flow vs USD/INR"
            value={fiiRupee.pearson_r}
            interpretation={fiiRupee.interpretation}
            pairedDays={fiiRupee.paired_days}
          />
          <CorrelationGauge
            label="Gold vs Equity Return"
            value={goldEquity.pearson_r}
            interpretation={goldEquity.interpretation}
            pairedDays={goldEquity.paired_days}
          />
        </div>

        {/* Interpretation note */}
        <div className="mt-4 pt-4 border-t border-[#1e1e2e] flex items-start gap-2">
          <CircleDot size={14} className="text-[#a1a1aa] mt-0.5 shrink-0" />
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            All three correlations are weak (|r| &lt; 0.15) for this period, suggesting FII activity, currency movement,
            and gold prices operated largely independently in January 2026. The FII sell-off did not strongly predict
            same-day market direction, indicating delayed or absorbed impact through DII counter-buying.
          </p>
        </div>
      </ChartCard>

      {/* ============================================================ */}
      {/*  Section 6: FII vs DII — Buy/Sell Breakdown                  */}
      {/* ============================================================ */}

      <ChartCard
        title="Institutional Buy vs Sell Breakdown"
        subtitle="Total volumes for January 2026"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FII Breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.fii }} />
              <span className="text-sm font-medium text-[#e4e4e7]">Foreign Institutional Investors (FII)</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#a1a1aa]">Buy Volume</span>
                  <span className="font-mono text-[#22c55e]">+{formatINR(fii.total_buy_amount_crore)} Cr</span>
                </div>
                <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{
                      width: `${(fii.total_buy_amount_crore / (fii.total_buy_amount_crore + Math.abs(fii.total_sell_amount_crore))) * 100}%`,
                    }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-[#22c55e]"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#a1a1aa]">Sell Volume</span>
                  <span className="font-mono text-[#ef4444]">{formatINR(fii.total_sell_amount_crore)} Cr</span>
                </div>
                <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{
                      width: `${(Math.abs(fii.total_sell_amount_crore) / (fii.total_buy_amount_crore + Math.abs(fii.total_sell_amount_crore))) * 100}%`,
                    }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="h-full rounded-full bg-[#ef4444]"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-[#1e1e2e]/50">
                <span className="text-[#a1a1aa]">Net</span>
                <span
                  className="font-mono font-medium"
                  style={{ color: fii.total_net_crore >= 0 ? "#22c55e" : "#ef4444" }}
                >
                  {formatINR(fii.total_net_crore)} Cr
                </span>
              </div>
            </div>
          </div>

          {/* DII Breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.dii }} />
              <span className="text-sm font-medium text-[#e4e4e7]">Domestic Institutional Investors (DII)</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#a1a1aa]">Buy Volume</span>
                  <span className="font-mono text-[#22c55e]">+{formatINR(dii.total_buy_amount_crore)} Cr</span>
                </div>
                <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{
                      width: `${(dii.total_buy_amount_crore / (dii.total_buy_amount_crore + Math.abs(dii.total_sell_amount_crore))) * 100}%`,
                    }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-[#22c55e]"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#a1a1aa]">Sell Volume</span>
                  <span className="font-mono text-[#ef4444]">{formatINR(dii.total_sell_amount_crore)} Cr</span>
                </div>
                <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{
                      width: `${(Math.abs(dii.total_sell_amount_crore) / (dii.total_buy_amount_crore + Math.abs(dii.total_sell_amount_crore))) * 100}%`,
                    }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="h-full rounded-full bg-[#ef4444]"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-[#1e1e2e]/50">
                <span className="text-[#a1a1aa]">Net</span>
                <span
                  className="font-mono font-medium"
                  style={{ color: dii.total_net_crore >= 0 ? "#22c55e" : "#ef4444" }}
                >
                  +{formatINR(dii.total_net_crore)} Cr
                </span>
              </div>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Data Source: Amar Ujala Karobar Section &middot; Institutional flow data from SEBI/exchange reports &middot; January 2026
      </div>
    </div>
  );
}
