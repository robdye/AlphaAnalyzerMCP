/** A single ticker row produced by show_portfolio_dashboard. */
export interface TickerData {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  sparkline: number[];
  news: NewsItem[];
}

export interface NewsItem {
  headline: string;
  url?: string;
}

/** The structured payload returned by show_portfolio_dashboard. */
export interface DashboardPayload {
  dashboard: TickerData[];
}

/** Tool inputs that the host may provide. */
export interface ToolInputs {
  tickers: string[];
  range: string;
}

/**
 * Minimal widget state persisted via the host.
 *
 * Keep this small — only scalar UI flags, never large data payloads.
 * The host may impose size limits on persisted state.
 */
export interface WidgetState {
  /** Currently selected ticker symbol, or null if none. */
  selectedTicker: string | null;
  /** Active range filter code (e.g. "1M", "1W"). */
  range: string;
}