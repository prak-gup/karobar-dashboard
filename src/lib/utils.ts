export function formatINR(value: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(value);
    if (abs >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${(value / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatCurrency(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}Rs ${formatINR(Math.abs(value))}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function sentimentColor(sentiment: string): string {
  switch (sentiment) {
    case "positive": return "#22c55e";
    case "negative": return "#ef4444";
    case "neutral": return "#a1a1aa";
    case "mixed": return "#f59e0b";
    default: return "#a1a1aa";
  }
}

export function sentimentBg(sentiment: string): string {
  switch (sentiment) {
    case "positive": return "bg-green-500/20 text-green-400";
    case "negative": return "bg-red-500/20 text-red-400";
    case "neutral": return "bg-zinc-500/20 text-zinc-400";
    case "mixed": return "bg-amber-500/20 text-amber-400";
    default: return "bg-zinc-500/20 text-zinc-400";
  }
}

export function impactBg(impact: string): string {
  switch (impact) {
    case "high": return "bg-red-500/20 text-red-400";
    case "medium": return "bg-amber-500/20 text-amber-400";
    case "low": return "bg-blue-500/20 text-blue-400";
    default: return "bg-zinc-500/20 text-zinc-400";
  }
}

export function categoryLabel(cat: string): string {
  return cat
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const CHART_COLORS = {
  sensex: "#3b82f6",
  nifty: "#8b5cf6",
  gold: "#f5a623",
  silver: "#94a3b8",
  fii: "#ef4444",
  dii: "#22c55e",
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#a1a1aa",
  mixed: "#f59e0b",
  accent: "#3b82f6",
};
