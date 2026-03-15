export interface DashboardData {
  metadata: Metadata;
  daily_market_data: DailyMarketData[];
  articles: Article[];
  analyses: Analyses;
  dashboard_charts: DashboardCharts;
  key_insights: string[];
  narrative_summary: string;
}

export interface Metadata {
  generated_at: string;
  data_period: { start: string; end: string };
  total_pdfs_processed: number;
  total_articles_extracted: number;
  months_covered: string[];
}

export interface DailyMarketData {
  date: string;
  market: {
    bse_sensex: { close: number; change: number; change_pct: number };
    nse_nifty: { close: number; change: number; change_pct: number };
    gold_per_10g: { price: number; change: number; unit: string };
    silver_per_kg: { price: number; change: number; unit: string };
    usd_inr: { rate: number; change: number };
    fii_activity: { amount_crore: number | null; type: string | null };
    dii_activity: { amount_crore: number | null; type: string | null };
  };
}

export interface Article {
  date: string;
  headline: string;
  headline_hindi: string;
  summary: string;
  category: string;
  article_size: string;
  sector: string;
  entities: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  sentiment_score: number;
  impact_level: "high" | "medium" | "low";
  keywords: string[];
  data_points: Record<string, string | number>;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface DashboardCharts {
  time_series: {
    sensex_daily: TimeSeriesPoint[];
    nifty_daily: TimeSeriesPoint[];
    gold_daily: TimeSeriesPoint[];
    silver_daily: TimeSeriesPoint[];
    usd_inr_daily: TimeSeriesPoint[];
    fii_daily: TimeSeriesPoint[];
    dii_daily: TimeSeriesPoint[];
    sentiment_daily: TimeSeriesPoint[];
    article_count_daily: TimeSeriesPoint[];
  };
  distributions: {
    category_pie: { label: string; value: number }[];
    sector_pie: { label: string; value: number }[];
    sentiment_distribution: Record<string, number>;
  };
  heatmaps: {
    sector_sentiment_by_week: Record<string, Record<string, number>>;
    day_of_week_returns: Record<string, { trading_days: number; avg_change_pts: number; total_change_pts: number; winning_pct: number }>;
    category_by_week: Record<string, Record<string, number>>;
  };
  rankings: {
    top_companies: { name: string; count: number; avg_sentiment: number }[];
    top_sectors: { name: string; count: number; avg_sentiment: number }[];
    top_policy_makers: { name: string; count: number; roles: string[]; sample_contexts: string[] }[];
    biggest_market_movers: { date: string; sensex_change: number }[];
  };
  kpi_cards: {
    total_articles: number;
    avg_daily_articles: number;
    sensex_period_return: number;
    gold_period_return: number;
    silver_period_return: number;
    rupee_period_change: number;
    net_fii_flow: number;
    net_dii_flow: number;
    overall_sentiment_score: number;
    policy_changes_count: number;
    ipos_tracked: number;
    most_covered_sector: string;
  };
}

export interface PolicyArticle {
  date: string;
  headline: string;
  summary: string;
  authority: string;
  affected_sectors: string[];
  impact_level: string;
  sentiment: string;
  sentiment_score: number;
  category: string;
}

export interface MacroIndicator {
  mention_count: number;
  avg_sentiment: number;
  articles: {
    date: string;
    headline: string;
    summary: string;
    sentiment: string;
    sentiment_score: number;
    data_points: Record<string, string | number>;
  }[];
}

export interface Analyses {
  market_trends: {
    sensex: MarketTrendDetail;
    nifty: MarketTrendDetail;
  };
  precious_metals: {
    gold: PreciousMetalDetail;
    silver: PreciousMetalDetail;
    gold_silver_ratio: Record<string, number>;
    gold_equity_correlation: number;
  };
  currency: {
    start_rate: number;
    end_rate: number;
    period_change: number;
    depreciation_pct: number;
    max_rate: number;
    min_rate: number;
    avg_rate: number;
    volatility: number;
  };
  institutional_flows: {
    fii: InstitutionalFlowDetail;
    dii: InstitutionalFlowDetail;
    fii_dii_divergence_days: {
      date: string;
      fii_crore: number;
      dii_crore: number;
      fii_action: string;
      dii_action: string;
    }[];
    divergence_count: number;
    fii_market_correlation: {
      pearson_r: number;
      paired_days: number;
      interpretation: string;
    };
  };
  category_distribution: Record<string, number>;
  sentiment: {
    overall_avg_sentiment_score: number;
    sentiment_by_week: Record<string, number>;
    sentiment_by_category: Record<string, number>;
    most_positive_days: { date: string; avg_sentiment: number }[];
    most_negative_days: { date: string; avg_sentiment: number }[];
    sentiment_distribution: Record<string, number>;
    daily_sentiment: Record<string, number>;
  };
  sector_analysis: {
    sectors: Record<string, { count: number; avg_sentiment: number; top_keywords: string[] }>;
    emerging_sectors: (string | { sector: string; first_half: number; second_half: number })[];
    stressed_sectors: (string | { sector: string; avg_sentiment: number; count: number })[];
    sector_heatmap: Record<string, Record<string, number>>;
  };
  policy_tracker: {
    total_policy_articles: number;
    policies: PolicyArticle[];
    most_active_regulator: string;
    authority_distribution: Record<string, number>;
    policy_frequency_by_week: Record<string, number>;
  };
  seasonality: {
    day_of_week_returns: Record<string, { trading_days: number; avg_change_pts: number; total_change_pts: number; winning_pct: number }>;
    best_weekday: string;
    worst_weekday: string;
    month_start_vs_end: Record<string, number>;
    republic_day_impact: Record<string, number>;
  };
  entity_intelligence: {
    most_mentioned_companies: { name: string; count: number; avg_sentiment: number }[];
    most_mentioned_people: { name: string; count: number; roles: string[] }[];
    most_mentioned_organizations: { name: string; count: number; avg_sentiment?: number }[];
    company_co_occurrence: Record<string, string[]>;
  };
  macro_indicators: Record<string, MacroIndicator>;
  investment_themes: Record<string, unknown>;
  risk_signals: {
    market_warnings: { count: number; avg_sentiment: number; articles: unknown[] };
    credit_risk: { count: number; avg_sentiment: number; articles: unknown[] };
    global_risks: { count: number; avg_sentiment: number; articles: unknown[] };
    regulatory_risks: { count: number; avg_sentiment: number; articles: unknown[] };
    risk_timeline: Record<string, { type: string; headline: string }[]>;
    highest_risk_days: { date: string; risk_count: number }[];
  };
  cross_cutting: {
    gold_vs_equity: { pearson_r: number; paired_days: number; interpretation: string };
    fii_vs_rupee: { pearson_r: number; paired_days: number; interpretation: string };
    news_volume_vs_volatility: Record<string, number>;
  };
  anomalies: {
    unusual_market_days_gt2std: { date: string; change: number; z_score: number }[];
    unusual_market_threshold: number;
    unusual_gold_moves: { date: string; change: number; z_score: number }[];
    unusual_silver_moves: { date: string; change: number; z_score: number }[];
    news_volume_anomalies: { date: string; count: number; z_score: number }[];
  };
}

export interface MarketTrendDetail {
  start_date: string;
  end_date: string;
  start_value: number;
  end_value: number;
  total_change_pct: number;
  best_day: { date: string; change: number; close: number };
  worst_day: { date: string; change: number; close: number };
  avg_daily_change_pts: number;
  volatility_pts_stddev: number;
  volatility_pct_stddev: number;
  winning_days: number;
  losing_days: number;
  flat_days: number;
  total_trading_days: number;
}

export interface PreciousMetalDetail {
  min_price: number;
  max_price: number;
  avg_price: number;
  period_return_pct: number;
  volatility_pct: number;
  start_price: number;
  end_price: number;
}

export interface InstitutionalFlowDetail {
  total_net_crore: number;
  total_buy_days: number;
  total_sell_days: number;
  total_buy_amount_crore: number;
  total_sell_amount_crore: number;
  biggest_buy_day: { date: string; amount_crore: number };
  biggest_sell_day: { date: string; amount_crore: number };
  avg_daily_flow_crore: number;
  data_points: number;
}
