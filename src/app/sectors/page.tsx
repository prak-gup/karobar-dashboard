"use client";

import { useDataContext } from "@/lib/data";
import { formatINR, sentimentColor, CHART_COLORS } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Building2, Users, Network, Sparkles, AlertTriangle,
  Hash, Briefcase, Globe,
} from "lucide-react";
import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function sentimentToColor(val: number): string {
  if (val > 0.3) return "#22c55e";
  if (val > 0.1) return "#22c55e80";
  if (val > -0.1) return "#a1a1aa60";
  if (val > -0.3) return "#ef444480";
  return "#ef4444";
}

function sentimentLabel(val: number): string {
  if (val > 0.3) return "Positive";
  if (val > 0.1) return "Slightly +ve";
  if (val > -0.1) return "Neutral";
  if (val > -0.3) return "Slightly -ve";
  return "Negative";
}

function barSentimentColor(val: number): string {
  if (val > 0.2) return CHART_COLORS.positive;
  if (val > -0.2) return CHART_COLORS.neutral;
  return CHART_COLORS.negative;
}

function CustomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload?: Record<string, unknown> }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-[#e4e4e7] font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value % 1 !== 0 ? p.value.toFixed(3) : p.value}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function SectorsPage() {
  const { data, loading, error } = useDataContext();

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return <div className="p-8 text-red-400">Error: {error}</div>;

  const { sector_analysis, entity_intelligence } = data.analyses;
  const { heatmaps, rankings } = data.dashboard_charts;

  /* ---- Sector Treemap Data ---- */
  const sectorEntries = Object.entries(sector_analysis.sectors)
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...sectorEntries.map((s) => s.count), 1);

  /* ---- Weekly Heatmap Data ---- */
  const weeklyHeatmap = heatmaps.sector_sentiment_by_week;
  const heatmapSectors = Object.keys(weeklyHeatmap);
  const weekKeys = heatmapSectors.length > 0
    ? Object.keys(weeklyHeatmap[heatmapSectors[0]]).sort()
    : [];
  const weekLabels = weekKeys.map((k) => k.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()));

  /* ---- Entity Bar Chart Data ---- */
  const companyData = (rankings.top_companies?.length ? rankings.top_companies : entity_intelligence.most_mentioned_companies)
    .slice(0, 12)
    .map((c) => ({ name: c.name, count: c.count, avg_sentiment: c.avg_sentiment }));

  const orgData = entity_intelligence.most_mentioned_organizations
    .slice(0, 10)
    .map((o) => ({ name: o.name, count: o.count, avg_sentiment: o.avg_sentiment }));

  const peopleData = entity_intelligence.most_mentioned_people.slice(0, 12);

  const coOccurrence = Object.entries(entity_intelligence.company_co_occurrence);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-[#f5a623]">Sectors</span>{" "}
          <span className="text-[#e4e4e7]">& Entities</span>
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          {sectorEntries.length} Sectors &middot; {companyData.length} Companies &middot; {peopleData.length} Key People
        </p>
      </motion.div>

      {/* ================================================================ */}
      {/*  1. Sector Treemap / Heatmap Grid                                */}
      {/* ================================================================ */}
      <ChartCard
        title="Sector Landscape"
        subtitle="Sized by mention count, colored by average sentiment"
        action={
          <div className="flex items-center gap-3 text-[10px] text-[#a1a1aa]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444] inline-block" /> Negative</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#a1a1aa60] inline-block" /> Neutral</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e] inline-block" /> Positive</span>
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {sectorEntries.map((sector, i) => {
            const sizeScale = 0.7 + 0.3 * (sector.count / maxCount);
            return (
              <motion.div
                key={sector.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="rounded-lg border border-[#1e1e2e] overflow-hidden hover:border-[#3e3e4e] transition-colors cursor-default"
                style={{
                  backgroundColor: sentimentToColor(sector.avg_sentiment),
                  minHeight: `${Math.round(100 * sizeScale)}px`,
                }}
              >
                <div className="p-3 h-full flex flex-col justify-between bg-[#0a0a0f]/60 backdrop-blur-sm">
                  <div>
                    <h4 className="text-[#e4e4e7] text-xs font-semibold leading-tight truncate">
                      {sector.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[#e4e4e7] text-lg font-bold font-mono">{sector.count}</span>
                      <span className="text-[10px] text-[#a1a1aa]">mentions</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center gap-1 mb-1">
                      {sector.avg_sentiment >= 0 ? (
                        <TrendingUp size={10} className="text-green-400" />
                      ) : (
                        <TrendingDown size={10} className="text-red-400" />
                      )}
                      <span
                        className="text-[10px] font-mono font-medium"
                        style={{ color: sector.avg_sentiment >= 0 ? "#22c55e" : "#ef4444" }}
                      >
                        {sector.avg_sentiment.toFixed(3)} ({sentimentLabel(sector.avg_sentiment)})
                      </span>
                    </div>
                    {sector.top_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sector.top_keywords.slice(0, 3).map((kw) => (
                          <span
                            key={kw}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e1e2e]/80 text-[#a1a1aa] truncate max-w-[80px]"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ChartCard>

      {/* ================================================================ */}
      {/*  2. Sector Sentiment by Week — CSS Grid Heatmap                  */}
      {/* ================================================================ */}
      {heatmapSectors.length > 0 && weekKeys.length > 0 && (
        <ChartCard
          title="Sector Sentiment by Week"
          subtitle="Weekly sentiment heatmap across sectors"
        >
          <div className="overflow-x-auto">
            <div
              className="grid gap-px min-w-[500px]"
              style={{
                gridTemplateColumns: `160px repeat(${weekKeys.length}, 1fr)`,
              }}
            >
              {/* Header Row */}
              <div className="text-[10px] text-[#a1a1aa] font-medium p-2" />
              {weekLabels.map((label) => (
                <div key={label} className="text-[10px] text-[#a1a1aa] font-medium p-2 text-center">
                  {label}
                </div>
              ))}

              {/* Data Rows */}
              {heatmapSectors.map((sector, ri) => (
                <>
                  <div
                    key={`label-${sector}`}
                    className="text-xs text-[#e4e4e7] font-medium p-2 truncate flex items-center"
                  >
                    {sector}
                  </div>
                  {weekKeys.map((week) => {
                    const val = weeklyHeatmap[sector][week] ?? 0;
                    return (
                      <motion.div
                        key={`${sector}-${week}`}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: ri * 0.02 }}
                        className="rounded-md flex items-center justify-center p-2 text-[11px] font-mono font-medium border border-[#1e1e2e]/30 hover:border-[#3e3e4e] transition-colors cursor-default"
                        style={{ backgroundColor: sentimentToColor(val) }}
                        title={`${sector} — ${week}: ${val.toFixed(3)}`}
                      >
                        <span className="text-[#e4e4e7] drop-shadow-sm">
                          {val.toFixed(2)}
                        </span>
                      </motion.div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </ChartCard>
      )}

      {/* ================================================================ */}
      {/*  3. Emerging & Stressed Sectors                                  */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Emerging Sectors"
          subtitle="Sectors showing growth signals"
          action={<Sparkles size={16} className="text-green-400" />}
        >
          {sector_analysis.emerging_sectors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sector_analysis.emerging_sectors.map((sector, i) => (
                <motion.span
                  key={sector}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/20"
                >
                  <TrendingUp size={13} />
                  {sector}
                </motion.span>
              ))}
            </div>
          ) : (
            <p className="text-[#a1a1aa] text-sm">No emerging sectors identified.</p>
          )}
        </ChartCard>

        <ChartCard
          title="Stressed Sectors"
          subtitle="Sectors facing headwinds"
          action={<AlertTriangle size={16} className="text-red-400" />}
        >
          {sector_analysis.stressed_sectors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sector_analysis.stressed_sectors.map((sector, i) => (
                <motion.span
                  key={sector}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/20"
                >
                  <TrendingDown size={13} />
                  {sector}
                </motion.span>
              ))}
            </div>
          ) : (
            <p className="text-[#a1a1aa] text-sm">No stressed sectors identified.</p>
          )}
        </ChartCard>
      </div>

      {/* ================================================================ */}
      {/*  4. Top Entities                                                 */}
      {/* ================================================================ */}

      {/* 4a. Top Companies — Horizontal Bar Chart */}
      <ChartCard
        title="Top Companies"
        subtitle="Most mentioned companies, colored by sentiment"
        action={<Building2 size={16} className="text-[#f5a623]" />}
      >
        <ResponsiveContainer width="100%" height={Math.max(280, companyData.length * 32)}>
          <BarChart
            data={companyData}
            layout="vertical"
            margin={{ top: 5, right: 30, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: "#e4e4e7", fontSize: 11 }}
              width={120}
            />
            <Tooltip content={<CustomBarTooltip />} />
            <Bar dataKey="count" name="Mentions" radius={[0, 4, 4, 0]} barSize={18}>
              {companyData.map((entry, index) => (
                <Cell key={`company-${index}`} fill={barSentimentColor(entry.avg_sentiment)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 4b. Top People */}
        <ChartCard
          title="Key People"
          subtitle="Most mentioned individuals & their roles"
          action={<Users size={16} className="text-[#f5a623]" />}
        >
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {peopleData.map((person, i) => (
              <motion.div
                key={person.name}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0f]/60 border border-[#1e1e2e]/50 hover:border-[#2e2e3e] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[#f5a623] font-mono text-xs font-bold w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[#e4e4e7] text-sm font-medium truncate">{person.name}</span>
                  </div>
                  {person.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 ml-8">
                      {person.roles.map((role) => (
                        <span
                          key={role}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e2e] text-[#a1a1aa]"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <Hash size={12} className="text-[#a1a1aa]" />
                  <span className="text-[#e4e4e7] font-mono text-sm font-semibold">{person.count}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>

        {/* 4c. Top Organizations — Horizontal Bar Chart */}
        <ChartCard
          title="Top Organizations"
          subtitle="Government bodies, regulators & institutions"
          action={<Globe size={16} className="text-[#f5a623]" />}
        >
          {orgData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(240, orgData.length * 32)}>
              <BarChart
                data={orgData}
                layout="vertical"
                margin={{ top: 5, right: 30, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "#e4e4e7", fontSize: 11 }}
                  width={100}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="count" name="Mentions" radius={[0, 4, 4, 0]} barSize={18}>
                  {orgData.map((entry, index) => (
                    <Cell key={`org-${index}`} fill={barSentimentColor(entry.avg_sentiment)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#a1a1aa] text-sm">No organization data available.</p>
          )}
        </ChartCard>
      </div>

      {/* ================================================================ */}
      {/*  5. Company Co-occurrence                                        */}
      {/* ================================================================ */}
      {coOccurrence.length > 0 && (
        <ChartCard
          title="Company Co-occurrence"
          subtitle="Companies frequently mentioned together in articles"
          action={<Network size={16} className="text-[#f5a623]" />}
        >
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {coOccurrence.map(([company, peers], i) => (
              <motion.div
                key={company}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-[#0a0a0f]/60 border border-[#1e1e2e]/50"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <Briefcase size={14} className="text-[#f5a623]" />
                  <span className="text-[#e4e4e7] text-sm font-semibold">{company}</span>
                </div>
                <div className="flex items-center gap-1 text-[#a1a1aa] text-xs shrink-0">
                  <span>appears with:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {peers.map((peer) => (
                    <span
                      key={peer}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-[#1e1e2e] text-[#e4e4e7]/80 border border-[#2e2e3e]/50"
                    >
                      {peer}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Sectors & Entities Analysis &middot; {data.metadata.total_articles_extracted} Articles &middot; {sectorEntries.length} Sectors Tracked
      </div>
    </div>
  );
}
