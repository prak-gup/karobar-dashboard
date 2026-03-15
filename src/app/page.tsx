"use client";

import { useDataContext } from "@/lib/data";
import { categoryLabel, sentimentColor } from "@/lib/utils";
import KpiCard from "@/components/ui/KpiCard";
import ChartCard from "@/components/ui/ChartCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Newspaper, Star, TrendingUp, Globe, Landmark, Users,
  Layers, ChevronDown, ChevronUp, Target, Lightbulb, BookOpen,
} from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f5a623", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#a855f7", "#14b8a6", "#f97316"];
const INVEST_COLORS: Record<string, string> = {
  "Gold & Silver": "#f5a623",
  "Equity/Stock Market": "#3b82f6",
  "Banking & NPA": "#8b5cf6",
  "Currency/Forex": "#06b6d4",
  "Mutual Funds/SIP/ETF": "#22c55e",
  "IPO & Listings": "#ec4899",
  "Insurance": "#f59e0b",
  "Real Estate": "#14b8a6",
  "Bonds/Debt": "#a855f7",
};

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

    articles.forEach((a) => {
      sizes[a.article_size] = (sizes[a.article_size] || 0) + 1;
      cats[a.category] = (cats[a.category] || 0) + 1;
      sentiments[a.sentiment] = (sentiments[a.sentiment] || 0) + 1;
      impacts[a.impact_level] = (impacts[a.impact_level] || 0) + 1;
    });

    const uniqueCategories = Object.keys(cats).length;
    const leadCount = sizes["lead"] || 0;
    const posRatio = ((sentiments.positive / articles.length) * 100).toFixed(0);
    const negRatio = ((sentiments.negative / articles.length) * 100).toFixed(0);

    // Investment topic mapping
    const investTopics: Record<string, Set<number>> = {};
    const investDefs: Record<string, (a: typeof articles[0]) => boolean> = {
      "Gold & Silver": (a) => a.keywords.some((k) => ["gold", "silver", "precious metals"].includes(k.toLowerCase())),
      "Equity/Stock Market": (a) => a.keywords.some((k) => ["Sensex", "Nifty", "stock", "FII selling", "DII"].includes(k)) || a.category === "stock_market",
      "Banking & NPA": (a) => a.keywords.some((k) => ["NPA", "banking", "RBI"].includes(k)) || a.category === "banking_finance",
      "Currency/Forex": (a) => a.category === "currency_forex",
      "Mutual Funds/SIP/ETF": (a) => a.keywords.some((k) => ["mutual fund", "SIP", "ETF", "investment"].includes(k.toLowerCase())) || a.category === "investment_advisory",
      "IPO & Listings": (a) => a.keywords.some((k) => k === "IPO"),
      "Insurance": (a) => a.category === "insurance",
      "Real Estate": (a) => a.category === "real_estate",
      "Bonds/Debt": (a) => a.keywords.some((k) => ["bond", "debt"].includes(k.toLowerCase())),
    };
    Object.keys(investDefs).forEach((topic) => { investTopics[topic] = new Set(); });
    articles.forEach((a, i) => {
      Object.entries(investDefs).forEach(([topic, fn]) => {
        if (fn(a)) investTopics[topic].add(i);
      });
    });
    const investData = Object.entries(investTopics)
      .map(([name, set]) => ({ name, value: set.size }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    // National vs International
    const intlKeywords = ["china", "us ", "usa", "trump", "global", "world", "international", "dollar", "fed ", "imf", "opec", "crude", "america", "japan", "europe", "uk ", "germany", "foreign"];
    const intlCount = articles.filter((a) =>
      intlKeywords.some((k) => a.headline.toLowerCase().includes(k) || a.summary.toLowerCase().includes(k)) ||
      a.category === "global_economy"
    ).length;
    const nationalCount = articles.length - intlCount;

    // RBI articles
    const rbiArticles = articles.filter((a) => a.entities.includes("RBI") || a.keywords.some((k) => k.toLowerCase().includes("rbi")));
    const rbiPositive = rbiArticles.filter((a) => a.sentiment === "positive").length;
    const rbiNegative = rbiArticles.filter((a) => a.sentiment === "negative").length;

    // Expert/Analyst tracking
    const expertEntities: Record<string, { count: number; contexts: string[] }> = {};
    const knownAnalysts = ["Saumil Gandhi", "VK Vijayakumar", "Praveen Singh", "Pollyanna De Lima", "CS Vigneshwar", "Anuj Chaudhary", "Rajesh Agrawal", "Vinod Nair", "Deepinder Goyal", "Sanjay Malhotra", "Nirmala Sitharaman", "Tuhin Kanta Pandey"];
    articles.forEach((a) => {
      a.entities.forEach((e) => {
        if (knownAnalysts.includes(e) || (e.includes(" ") && e.length > 4 && !["RBI", "NSE", "BSE", "SEBI", "SBI", "TCS", "ITC", "IMF", "EPFO"].includes(e))) {
          if (!expertEntities[e]) expertEntities[e] = { count: 0, contexts: [] };
          expertEntities[e].count++;
          if (expertEntities[e].contexts.length < 2) expertEntities[e].contexts.push(a.headline.substring(0, 60));
        }
      });
    });
    const topExperts = Object.entries(expertEntities)
      .filter(([, v]) => v.count >= 3)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10);

    // Content type split
    const currentNews = articles.filter((a) => ["corporate_news", "stock_market", "commodities", "currency_forex"].includes(a.category)).length;
    const economyAnalysis = articles.filter((a) => ["government_policy", "regulatory", "global_economy", "employment_labor", "agriculture", "infrastructure", "trade_exports"].includes(a.category)).length;
    const investmentContent = articles.filter((a) => ["investment_advisory", "personal_finance", "insurance", "real_estate", "banking_finance"].includes(a.category)).length;

    // Category pie
    const categoryPie = Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .map(([label, value]) => ({ label: categoryLabel(label), value }));

    // Sentiment donut
    const sentDonut = Object.entries(sentiments).map(([k, v]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      value: v,
      color: sentimentColor(k),
    }));

    // Article size data
    const sizeData = Object.entries(sizes)
      .sort(([, a], [, b]) => b - a)
      .map(([label, value]) => ({ name: label.charAt(0).toUpperCase() + label.slice(1).replace("_", " "), value }));

    return {
      total: articles.length, leadCount, uniqueCategories, posRatio, negRatio,
      highImpact: impacts.high, categoryPie, sizeData, sentDonut, sentiments, impacts,
      investData, intlCount, nationalCount, rbiCount: rbiArticles.length,
      rbiPositive, rbiNegative, topExperts, currentNews, economyAnalysis, investmentContent,
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
          January 2026 &middot; Amar Ujala Business Section &middot; {data.metadata.total_pdfs_processed} Pages &middot; {stats.total} Articles
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-6 lg:gap-3">
        <KpiCard label="Total Articles" value={String(stats.total)} icon={<Newspaper size={16} />} delay={0} />
        <KpiCard label="Lead Stories" value={String(stats.leadCount)} color="gold" icon={<Star size={16} />} delay={0.05} />
        <KpiCard label="National" value={String(stats.nationalCount)} icon={<Landmark size={16} />} delay={0.1} />
        <KpiCard label="International" value={String(stats.intlCount)} color="neutral" icon={<Globe size={16} />} delay={0.15} />
        <KpiCard label="RBI Coverage" value={String(stats.rbiCount)} color="gold" icon={<Landmark size={16} />} delay={0.2} />
        <KpiCard label="High Impact" value={String(stats.highImpact)} color="red" icon={<Target size={16} />} delay={0.25} />
      </div>

      {/* Row: Investment Topics + National vs International + Content Type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Investment Topics */}
        <ChartCard title="Investment Topic Coverage" subtitle="What financial topics are covered most">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.investData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #2e2e3e", borderRadius: "8px" }} itemStyle={{ color: "#e4e4e7" }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Articles">
                {stats.investData.map((d) => (
                  <Cell key={d.name} fill={INVEST_COLORS[d.name] || "#a1a1aa"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* National vs International */}
        <ChartCard title="National vs International" subtitle="Domestic vs global coverage split">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[
                { name: "National", value: stats.nationalCount },
                { name: "International", value: stats.intlCount },
              ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}>
                <Cell fill="#f5a623" />
                <Cell fill="#3b82f6" />
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #2e2e3e", borderRadius: "8px" }} itemStyle={{ color: "#e4e4e7" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="text-center p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
              <p className="font-mono text-2xl font-bold text-[#f5a623]">{stats.nationalCount}</p>
              <p className="text-xs text-[#a1a1aa] mt-1">National ({((stats.nationalCount / stats.total) * 100).toFixed(0)}%)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
              <p className="font-mono text-2xl font-bold text-[#3b82f6]">{stats.intlCount}</p>
              <p className="text-xs text-[#a1a1aa] mt-1">International ({((stats.intlCount / stats.total) * 100).toFixed(0)}%)</p>
            </div>
          </div>

          {/* Content Type Split */}
          <div className="mt-4 space-y-2">
            <p className="text-xs text-[#a1a1aa] font-medium">Content Type</p>
            {[
              { label: "Market/Current News", count: stats.currentNews, color: "#ef4444" },
              { label: "Economy/Policy Analysis", count: stats.economyAnalysis, color: "#f5a623" },
              { label: "Investment/Personal Finance", count: stats.investmentContent, color: "#22c55e" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-[#a1a1aa]">{item.label}</span>
                  <span className="font-mono text-[#e4e4e7]">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-[#0a0a0f] overflow-hidden">
                  <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${(item.count / stats.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* RBI & Expert Coverage */}
        <ChartCard title="RBI & Expert Voices" subtitle="Regulatory coverage and key analysts quoted">
          {/* RBI Section */}
          <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Landmark size={14} className="text-[#3b82f6]" />
              <span className="text-sm font-medium text-[#e4e4e7]">RBI Coverage</span>
              <span className="ml-auto font-mono text-sm text-[#3b82f6]">{stats.rbiCount} articles</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">{stats.rbiPositive} positive</span>
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{stats.rbiNegative} negative</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400">{stats.rbiCount - stats.rbiPositive - stats.rbiNegative} other</span>
            </div>
          </div>

          {/* Top Experts */}
          <p className="text-xs text-[#a1a1aa] font-medium mb-2 flex items-center gap-1.5">
            <Users size={12} /> Most Quoted Experts & Analysts
          </p>
          <div className="space-y-2">
            {stats.topExperts.map(([name, info], i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2 p-2 rounded-lg bg-[#0a0a0f]/60 border border-[#1e1e2e]/50"
              >
                <span className="text-[10px] font-mono text-[#a1a1aa] mt-0.5 w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#e4e4e7] font-medium truncate">{name}</span>
                    <span className="font-mono text-xs text-[#f5a623] ml-2 shrink-0">{info.count}x</span>
                  </div>
                  <p className="text-[10px] text-[#a1a1aa] truncate mt-0.5">{info.contexts[0]}</p>
                </div>
              </motion.div>
            ))}
          </div>
          {stats.topExperts.length === 0 && (
            <p className="text-xs text-[#a1a1aa] text-center py-4">No recurring expert voices found</p>
          )}
        </ChartCard>
      </div>

      {/* Row: Category Pie + Placement + Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Content Categories" subtitle={`${stats.uniqueCategories} categories`}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats.categoryPie} cx="50%" cy="50%" innerRadius={45} outerRadius={90} dataKey="value" nameKey="label" paddingAngle={1}>
                {stats.categoryPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #2e2e3e", borderRadius: "8px" }} itemStyle={{ color: "#e4e4e7" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {stats.categoryPie.slice(0, 8).map((cat, i) => (
              <div key={cat.label} className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                <span className="truncate">{cat.label}</span>
                <span className="font-mono text-[#e4e4e7] ml-auto">{cat.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Story Placement" subtitle="How articles are positioned">
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
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className="h-full rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Sentiment Balance" subtitle="Editorial tone">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.sentDonut} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" nameKey="name" paddingAngle={2}>
                {stats.sentDonut.map((s) => (<Cell key={s.name} fill={s.color} />))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #2e2e3e", borderRadius: "8px" }} itemStyle={{ color: "#e4e4e7" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {stats.sentDonut.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[#a1a1aa]">{s.name}</span>
                <span className="font-mono text-[#e4e4e7] ml-auto">{s.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
            <p className="text-xs text-[#a1a1aa]">
              <span className="text-green-400 font-medium">{stats.posRatio}% positive</span> vs{" "}
              <span className="text-red-400 font-medium">{stats.negRatio}% negative</span>
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Impact + Insights */}
      <ChartCard title="Story Impact Distribution">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "High Impact", count: stats.impacts.high, color: "#ef4444", desc: "Market-moving" },
            { label: "Medium Impact", count: stats.impacts.medium, color: "#f59e0b", desc: "Important" },
            { label: "Low Impact", count: stats.impacts.low, color: "#3b82f6", desc: "Routine" },
          ].map((item) => (
            <div key={item.label} className="text-center p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
              <p className="font-mono text-2xl font-bold" style={{ color: item.color }}>{item.count}</p>
              <p className="text-xs text-[#e4e4e7] mt-1">{item.label}</p>
              <div className="mt-2 h-1.5 rounded-full bg-[#1e1e2e] overflow-hidden">
                <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${(item.count / stats.total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Key Insights */}
      <ChartCard title="Editorial Insights" subtitle={`${data.key_insights.length} patterns identified`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.key_insights.map((insight, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }} className="flex gap-3 p-3 rounded-lg bg-[#0a0a0f]/60 border border-[#1e1e2e]/50">
              <span className="text-[#f5a623] font-mono text-xs font-bold mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-sm text-[#e4e4e7]/90 leading-relaxed">{insight}</p>
            </motion.div>
          ))}
        </div>
      </ChartCard>

      {/* Summary */}
      <ChartCard title="Month Summary">
        <div>
          <div className={`text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-line ${!expandedSummary ? "line-clamp-4" : ""}`}>
            {data.narrative_summary}
          </div>
          <button onClick={() => setExpandedSummary(!expandedSummary)} className="flex items-center gap-1 mt-3 text-xs text-[#f5a623] hover:text-[#f5a623]/80 transition-colors">
            {expandedSummary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expandedSummary ? "Show less" : "Read full summary"}
          </button>
        </div>
      </ChartCard>

      <div className="text-center py-4 text-[10px] text-[#a1a1aa]/40">
        Data Source: Amar Ujala Karobar Section &middot; January 2026
      </div>
    </div>
  );
}
