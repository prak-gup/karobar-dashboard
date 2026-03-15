"use client";

import { useDataContext } from "@/lib/data";
import { categoryLabel, sentimentColor } from "@/lib/utils";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Map, Building2, Users, Tag, Focus, GitBranch, AlertTriangle, Sprout, TrendingDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

/* ---------- Helpers ---------- */

/** Interpolate between red (#ef4444) and green (#22c55e) based on sentiment score [-1, 1] */
function sentimentBarColor(score: number): string {
  const t = Math.max(0, Math.min(1, (score + 1) / 2)); // normalize to 0..1
  const r = Math.round(239 + t * (34 - 239));
  const g = Math.round(68 + t * (197 - 68));
  const b = Math.round(68 + t * (94 - 68));
  return `rgb(${r},${g},${b})`;
}

/* ---------- Tooltip Components ---------- */

function SectorTooltip({ active, payload }: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as { sector: string; count: number; avgSentiment: number; pct: number };
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm text-[#e4e4e7] font-medium">{d.sector}</p>
      <p className="text-xs text-[#a1a1aa]">{d.count} articles ({d.pct.toFixed(1)}%)</p>
      <p className="text-xs font-mono" style={{ color: sentimentBarColor(d.avgSentiment) }}>
        Avg Sentiment: {d.avgSentiment.toFixed(3)}
      </p>
    </div>
  );
}

function EntityTooltip({ active, payload }: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as { name: string; count: number; avg_sentiment: number };
  return (
    <div className="bg-[#1a1a2e] border border-[#2e2e3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm text-[#e4e4e7] font-medium">{d.name}</p>
      <p className="text-xs text-[#a1a1aa]">{d.count} mentions</p>
      <p className="text-xs font-mono" style={{ color: sentimentBarColor(d.avg_sentiment) }}>
        Avg Sentiment: {d.avg_sentiment.toFixed(3)}
      </p>
    </div>
  );
}

/* ---------- Tag Cloud Colors ---------- */

const TAG_COLORS = [
  "#3b82f6", "#8b5cf6", "#f5a623", "#22c55e", "#06b6d4",
  "#ec4899", "#84cc16", "#a855f7", "#14b8a6", "#f97316",
  "#38bdf8", "#f87171", "#a78bfa", "#fbbf24", "#4ade80",
];

/* ---------- Main Page ---------- */

export default function CoveragePage() {
  const { data, loading, error } = useDataContext();

  /* ---- Sector Coverage Data ---- */
  const sectorData = useMemo(() => {
    if (!data) return [];
    const sectors = data.analyses.sector_analysis.sectors;
    const totalArticles = data.articles.length;
    return Object.entries(sectors)
      .map(([name, info]) => ({
        sector: categoryLabel(name),
        rawSector: name,
        count: info.count,
        avgSentiment: info.avg_sentiment,
        topKeywords: info.top_keywords?.slice(0, 3) ?? [],
        pct: totalArticles > 0 ? (info.count / totalArticles) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  /* ---- Keyword Frequency ---- */
  const keywordCloud = useMemo(() => {
    if (!data) return [];
    const freq: Record<string, number> = {};
    data.articles.forEach((a) => {
      a.keywords.forEach((kw) => {
        const k = kw.trim();
        if (k) freq[k] = (freq[k] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 40)
      .map(([word, count]) => ({ word, count }));
  }, [data]);

  const maxKeywordCount = keywordCloud.length > 0 ? keywordCloud[0].count : 1;

  /* ---- Entity Concentration ---- */
  const concentration = useMemo(() => {
    if (!data) return null;
    const companies = data.analyses.entity_intelligence.most_mentioned_companies;
    const totalMentions = companies.reduce((s, c) => s + c.count, 0);
    if (totalMentions === 0) return null;
    const top1 = companies[0];
    const top5Total = companies.slice(0, 5).reduce((s, c) => s + c.count, 0);
    return {
      topEntity: top1,
      topPct: (top1.count / totalMentions) * 100,
      top5Pct: (top5Total / totalMentions) * 100,
      totalMentions,
      top5: companies.slice(0, 5),
      rest: totalMentions - top5Total,
    };
  }, [data]);

  /* ---- Coverage Gaps ---- */
  const coverageGaps = useMemo(() => {
    if (!data) return [];
    const totalArticles = data.articles.length;
    const threshold = totalArticles * 0.02; // 2%
    return sectorData.filter((s) => s.count <= threshold && s.count > 0);
  }, [data, sectorData]);

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return <div className="p-8 text-red-400">Error: {error}</div>;

  const { entity_intelligence, sector_analysis } = data.analyses;
  const emergingSectors = sector_analysis.emerging_sectors ?? [];
  const stressedSectors = sector_analysis.stressed_sectors ?? [];
  const companies = entity_intelligence.most_mentioned_companies.slice(0, 15);
  const people = entity_intelligence.most_mentioned_people;
  const organizations = entity_intelligence.most_mentioned_organizations;
  const coOccurrence = entity_intelligence.company_co_occurrence;
  const totalArticles = data.articles.length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-[#f5a623]">Coverage</span>{" "}
          <span className="text-[#e4e4e7]">Map</span>
        </h1>
        <p className="text-[#a1a1aa] text-sm mt-1">
          WHO and WHAT gets covered &middot; {totalArticles} articles across{" "}
          {Object.keys(sector_analysis.sectors).length} sectors &middot; January 2026
        </p>
      </motion.div>

      {/* ====== 1. Sector Coverage — Horizontal Bar Chart ====== */}
      <ChartCard
        title="Sector Coverage"
        subtitle="Article count by sector — bars colored by average sentiment"
        action={
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#ef4444]">Negative</span>
            <div className="w-16 h-1.5 rounded-full bg-gradient-to-r from-[#ef4444] via-[#f59e0b] to-[#22c55e]" />
            <span className="text-[10px] text-[#22c55e]">Positive</span>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={Math.max(360, sectorData.length * 32)}>
          <BarChart
            data={sectorData}
            layout="vertical"
            margin={{ top: 5, right: 40, bottom: 5, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="sector"
              width={140}
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
            />
            <Tooltip content={<SectorTooltip />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
              {sectorData.map((entry, idx) => (
                <Cell key={idx} fill={sentimentBarColor(entry.avgSentiment)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ====== 2. Sector Coverage Balance — Treemap-style Grid ====== */}
      <ChartCard
        title="Sector Coverage Balance"
        subtitle="Coverage equity — larger cards represent more articles"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sectorData.map((s, i) => {
            const isEmerging = emergingSectors.some(
              (es) => es.toLowerCase() === s.rawSector.toLowerCase()
            );
            const isStressed = stressedSectors.some(
              (ss) => ss.toLowerCase() === s.rawSector.toLowerCase()
            );
            // Scale padding based on relative article count
            const maxCount = sectorData[0]?.count ?? 1;
            const scale = 0.7 + (s.count / maxCount) * 0.3;

            return (
              <motion.div
                key={s.rawSector}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg overflow-hidden hover:border-[#2e2e3e] transition-colors"
                style={{ minHeight: `${Math.round(scale * 120)}px` }}
              >
                <div className="p-3 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-sm font-medium text-[#e4e4e7] leading-tight">
                        {s.sector}
                      </h4>
                      <div className="flex gap-1 flex-shrink-0">
                        {isEmerging && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 whitespace-nowrap flex items-center gap-0.5">
                            <Sprout size={9} />
                            Emerging
                          </span>
                        )}
                        {isStressed && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap flex items-center gap-0.5">
                            <TrendingDown size={9} />
                            Stressed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-xl font-bold font-mono text-[#e4e4e7]">{s.count}</span>
                      <span className="text-xs text-[#a1a1aa]">articles ({s.pct.toFixed(1)}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sentimentBarColor(s.avgSentiment) }} />
                      <span className="text-xs font-mono" style={{ color: sentimentBarColor(s.avgSentiment) }}>
                        {s.avgSentiment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {s.topKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.topKeywords.map((kw, ki) => (
                        <span
                          key={ki}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e1e2e] text-[#a1a1aa]"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Sentiment bar at bottom */}
                <div
                  className="h-1"
                  style={{
                    backgroundColor: sentimentBarColor(s.avgSentiment),
                    width: `${s.pct}%`,
                    minWidth: "8px",
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </ChartCard>

      {/* ====== 3. Top Entities ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 3a. Companies/Institutions */}
        <ChartCard
          title="Top Companies & Institutions"
          subtitle={`${companies.length} most mentioned — colored by sentiment`}
          action={<Building2 size={16} className="text-[#a1a1aa]" />}
        >
          <ResponsiveContainer width="100%" height={Math.max(300, companies.length * 28)}>
            <BarChart
              data={companies}
              layout="vertical"
              margin={{ top: 5, right: 40, bottom: 5, left: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
              />
              <Tooltip content={<EntityTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                {companies.map((c, idx) => (
                  <Cell key={idx} fill={sentimentBarColor(c.avg_sentiment)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-[10px] text-[#ef4444]">Negative</span>
            <div className="w-24 h-1.5 rounded-full bg-gradient-to-r from-[#ef4444] via-[#f59e0b] to-[#22c55e]" />
            <span className="text-[10px] text-[#22c55e]">Positive</span>
          </div>
        </ChartCard>

        {/* 3b. Key People */}
        <ChartCard
          title="Key People"
          subtitle={`${people.length} most mentioned individuals`}
          action={<Users size={16} className="text-[#a1a1aa]" />}
        >
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
            {people.map((person, i) => (
              <motion.div
                key={person.name}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] hover:border-[#2e2e3e] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#e4e4e7] font-medium truncate">{person.name}</span>
                    <span className="text-xs font-mono text-[#a1a1aa] flex-shrink-0">{person.count}x</span>
                  </div>
                  {person.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {person.roles.map((role, ri) => (
                        <span
                          key={ri}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Mention bar */}
                <div className="w-20 flex-shrink-0">
                  <div className="h-1.5 rounded-full bg-[#1e1e2e] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#8b5cf6]"
                      style={{
                        width: `${people.length > 0 ? (person.count / people[0].count) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* 3c. Organizations */}
      {organizations.length > 0 && (
        <ChartCard
          title="Organizations"
          subtitle={`${organizations.length} most mentioned organizations`}
          action={<Map size={16} className="text-[#a1a1aa]" />}
        >
          <ResponsiveContainer width="100%" height={Math.max(240, Math.min(organizations.length, 15) * 28)}>
            <BarChart
              data={organizations.slice(0, 15)}
              layout="vertical"
              margin={{ top: 5, right: 40, bottom: 5, left: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
              />
              <Tooltip content={<EntityTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                {organizations.slice(0, 15).map((o, idx) => (
                  <Cell key={idx} fill={sentimentBarColor(o.avg_sentiment)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ====== 4. Keyword Frequency Cloud ====== */}
      <ChartCard
        title="Keyword Frequency"
        subtitle={`Top ${keywordCloud.length} keywords across all articles`}
        action={<Tag size={16} className="text-[#a1a1aa]" />}
      >
        <div className="flex flex-wrap gap-2 items-center justify-center py-4">
          {keywordCloud.map((kw, i) => {
            const ratio = kw.count / maxKeywordCount;
            const fontSize = 12 + ratio * 16; // 12px to 28px
            const color = TAG_COLORS[i % TAG_COLORS.length];
            return (
              <motion.span
                key={kw.word}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.015 }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#1e1e2e] hover:border-[#2e2e3e] transition-colors cursor-default"
                style={{
                  fontSize: `${fontSize}px`,
                  color,
                  backgroundColor: `${color}08`,
                }}
              >
                {kw.word}
                <span
                  className="text-[10px] font-mono opacity-60"
                  style={{ fontSize: "10px" }}
                >
                  {kw.count}
                </span>
              </motion.span>
            );
          })}
        </div>
      </ChartCard>

      {/* ====== 5. Entity Concentration ====== */}
      {concentration && (
        <ChartCard
          title="Entity Concentration"
          subtitle="Is coverage too concentrated on a few entities?"
          action={<Focus size={16} className="text-[#a1a1aa]" />}
        >
          <div className="space-y-4">
            {/* Top stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-center">
                <p className="text-xs text-[#a1a1aa] mb-1">Top Entity</p>
                <p className="text-lg font-bold text-[#f5a623] font-mono">{concentration.topEntity.name}</p>
                <p className="text-xs text-[#a1a1aa]">
                  {concentration.topEntity.count} mentions ({concentration.topPct.toFixed(1)}%)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-center">
                <p className="text-xs text-[#a1a1aa] mb-1">Top 5 Concentration</p>
                <p className="text-lg font-bold text-[#e4e4e7] font-mono">{concentration.top5Pct.toFixed(1)}%</p>
                <p className="text-xs text-[#a1a1aa]">of all entity mentions</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-center">
                <p className="text-xs text-[#a1a1aa] mb-1">Total Entity Mentions</p>
                <p className="text-lg font-bold text-[#e4e4e7] font-mono">{concentration.totalMentions}</p>
                <p className="text-xs text-[#a1a1aa]">across all companies</p>
              </div>
            </div>

            {/* Concentration bar */}
            <div>
              <p className="text-xs text-[#a1a1aa] mb-2">Mention distribution</p>
              <div className="h-6 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] overflow-hidden flex">
                {concentration.top5.map((c, i) => {
                  const pct = (c.count / concentration.totalMentions) * 100;
                  const colors = ["#f5a623", "#3b82f6", "#8b5cf6", "#22c55e", "#06b6d4"];
                  return (
                    <div
                      key={c.name}
                      className="h-full flex items-center justify-center transition-all relative group"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: colors[i],
                        minWidth: pct > 2 ? "auto" : "4px",
                      }}
                    >
                      {pct > 8 && (
                        <span className="text-[9px] text-white font-medium truncate px-1">
                          {c.name}
                        </span>
                      )}
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1a1a2e] border border-[#2e2e3e] rounded px-2 py-1 text-[10px] text-[#e4e4e7] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {c.name}: {c.count} ({pct.toFixed(1)}%)
                      </div>
                    </div>
                  );
                })}
                {concentration.rest > 0 && (
                  <div
                    className="h-full flex items-center justify-center bg-[#1e1e2e]"
                    style={{ width: `${((concentration.rest / concentration.totalMentions) * 100)}%` }}
                  >
                    <span className="text-[9px] text-[#a1a1aa] font-medium">Others</span>
                  </div>
                )}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-2">
                {concentration.top5.map((c, i) => {
                  const colors = ["#f5a623", "#3b82f6", "#8b5cf6", "#22c55e", "#06b6d4"];
                  return (
                    <div key={c.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: colors[i] }} />
                      <span className="text-[#a1a1aa]">{c.name}</span>
                      <span className="font-mono text-[#e4e4e7]">{c.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Concentration assessment */}
            <div className={`p-3 rounded-lg border ${
              concentration.top5Pct > 50
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-green-500/10 border-green-500/30"
            }`}>
              <p className={`text-xs ${concentration.top5Pct > 50 ? "text-amber-400" : "text-green-400"}`}>
                {concentration.top5Pct > 50
                  ? `Coverage is concentrated: Top 5 entities account for ${concentration.top5Pct.toFixed(0)}% of all mentions. Consider diversifying entity coverage.`
                  : `Coverage is relatively balanced: Top 5 entities account for ${concentration.top5Pct.toFixed(0)}% of mentions.`}
              </p>
            </div>
          </div>
        </ChartCard>
      )}

      {/* ====== 6. Co-occurrence Network ====== */}
      {Object.keys(coOccurrence).length > 0 && (
        <ChartCard
          title="Co-occurrence Network"
          subtitle="Which entities appear together in articles — editorial pairing patterns"
          action={<GitBranch size={16} className="text-[#a1a1aa]" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {Object.entries(coOccurrence)
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([entity, partners], i) => (
                <motion.div
                  key={entity}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.02 }}
                  className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] hover:border-[#2e2e3e] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium text-[#f5a623]">{entity}</span>
                    <span className="text-[10px] text-[#a1a1aa] font-mono">
                      ({partners.length} connection{partners.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {partners.map((partner, pi) => (
                      <span
                        key={pi}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
                      >
                        {partner}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
          </div>
        </ChartCard>
      )}

      {/* ====== 7. Coverage Gaps ====== */}
      {coverageGaps.length > 0 && (
        <ChartCard
          title="Coverage Gaps"
          subtitle="Sectors with less than 2% of total articles — potential blindspots"
          action={<AlertTriangle size={16} className="text-amber-400" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coverageGaps.map((gap, i) => (
              <motion.div
                key={gap.rawSector}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">{gap.sector}</p>
                    <p className="text-xs text-amber-400/70 mt-0.5">
                      Only {gap.count} article{gap.count !== 1 ? "s" : ""} ({gap.pct.toFixed(1)}%) — consider increasing coverage
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-[#a1a1aa]">Sentiment:</span>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: sentimentBarColor(gap.avgSentiment) }}
                      >
                        {gap.avgSentiment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Data Source: Amar Ujala Karobar Section &middot; January 2026 &middot; {totalArticles} Articles Analyzed
      </div>
    </div>
  );
}
