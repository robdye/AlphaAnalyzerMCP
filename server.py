"""
AlphaAnalyzerMCP - Finnhub Market Data MCP Server

A Model Context Protocol (MCP) server built with Python FastMCP that exposes
all Finnhub.io free-tier API endpoints as tools.  The Finnhub API key is read
from the FINNHUB_API_KEY environment variable (set as an Azure App Setting)
so it is never exposed to callers or hard-coded in source.
"""

import asyncio
import datetime
import hashlib
import json
import os
import re

import aiofiles
import httpx
from mcp.server.fastmcp import FastMCP
from mcp.types import CallToolResult, TextContent

AZURE_HOST = os.environ.get("WEBSITE_HOSTNAME", "alphaanalyzer-mcp.azurewebsites.net")

mcp = FastMCP(
    "AlphaAnalyzerMCP",
    instructions=(
        "Financial market data server powered by Finnhub.io. "
        "All tools use the server-side API key automatically."
    ),
    host="0.0.0.0",
    port=int(os.environ.get("PORT", "8000")),
    stateless_http=True,
    transport_security={
        "enable_dns_rebinding_protection": False,
    },
)

FINNHUB_BASE = "https://finnhub.io/api/v1"

_http_client: httpx.AsyncClient | None = None


def _get_http_client() -> httpx.AsyncClient:
    """Return a shared HTTP client with connection pooling and timeouts."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
        )
    return _http_client


def _get_api_key() -> str:
    """Return the Finnhub API key from the environment."""
    key = os.environ.get("FINNHUB_API_KEY", "")
    if not key:
        raise RuntimeError(
            "FINNHUB_API_KEY environment variable is not set. "
            "Configure it as an Azure App Setting or export it locally."
        )
    return key


_TICKER_RE = re.compile(r"^[A-Za-z0-9.:\-/]{1,20}$")


def _validate_ticker(symbol: str) -> str:
    """Sanitise and validate a ticker symbol."""
    symbol = symbol.strip().upper()
    if not symbol or not _TICKER_RE.match(symbol):
        raise ValueError(f"Invalid ticker symbol: {symbol!r}")
    return symbol


async def _finnhub_get(path: str, params: dict[str, str] | None = None) -> str:
    """Make a GET request to the Finnhub API and return formatted JSON."""
    query: dict[str, str] = {"token": _get_api_key()}
    if params:
        query.update(params)
    client = _get_http_client()
    resp = await client.get(f"{FINNHUB_BASE}/{path}", params=query)
    resp.raise_for_status()
    return json.dumps(resp.json(), indent=2)


# == Stock Fundamentals ======================================================


@mcp.tool()
async def symbol_search(query: str) -> str:
    """Look up a stock symbol by company name. Returns matching ticker symbols, descriptions, and exchange information."""
    return await _finnhub_get("search", {"q": query})


@mcp.tool()
async def company_profile(symbol: str) -> str:
    """Get company profile including name, market capitalisation, industry, IPO date, logo, and website."""
    return await _finnhub_get("stock/profile2", {"symbol": symbol})


@mcp.tool()
async def company_peers(symbol: str) -> str:
    """Get company peers - a list of similar companies in the same industry and sub-industry."""
    return await _finnhub_get("stock/peers", {"symbol": symbol})


@mcp.tool()
async def basic_financials(symbol: str, metric: str = "all") -> str:
    """Get basic financial data including revenue, earnings, margins, and ratios reported in annual and quarterly filings."""
    return await _finnhub_get(
        "stock/metric", {"symbol": symbol, "metric": metric}
    )


# == Stock Price ==============================================================


@mcp.tool()
async def quote(symbol: str) -> str:
    """Get real-time stock quote including current price, change, percent change, high, low, open, and previous close."""
    return await _finnhub_get("quote", {"symbol": symbol})


@mcp.tool()
async def stock_candles(
    symbol: str,
    resolution: str,
    from_timestamp: int,
    to_timestamp: int,
) -> str:
    """Get stock candles (OHLCV) for a date range. Resolution options: 1, 5, 15, 30, 60, D, W, M."""
    return await _finnhub_get(
        "stock/candle",
        {
            "symbol": symbol,
            "resolution": resolution,
            "from": str(from_timestamp),
            "to": str(to_timestamp),
        },
    )


# == Stock Estimates ==========================================================


@mcp.tool()
async def recommendation_trends(symbol: str) -> str:
    """Get analyst recommendation trends (buy, hold, sell, strong buy, strong sell) for a stock."""
    return await _finnhub_get("stock/recommendation", {"symbol": symbol})


@mcp.tool()
async def price_target(symbol: str) -> str:
    """Get consensus analyst price target including high, low, mean, and median targets."""
    return await _finnhub_get("stock/price-target", {"symbol": symbol})


@mcp.tool()
async def earnings_surprises(symbol: str) -> str:
    """Get company earnings surprises showing actual vs estimated EPS for recent quarters."""
    return await _finnhub_get("stock/earnings", {"symbol": symbol})


# == News and Sentiment =======================================================


@mcp.tool()
async def company_news(symbol: str, from_date: str, to_date: str) -> str:
    """Get latest company news articles within a date range. Dates in YYYY-MM-DD format."""
    return await _finnhub_get(
        "company-news",
        {"symbol": symbol, "from": from_date, "to": to_date},
    )


@mcp.tool()
async def market_news(category: str = "general") -> str:
    """Get general market news by category. Categories: general, forex, crypto, merger."""
    return await _finnhub_get("news", {"category": category})


@mcp.tool()
async def news_sentiment(symbol: str) -> str:
    """Get company news sentiment and buzz statistics from recent articles."""
    return await _finnhub_get("news-sentiment", {"symbol": symbol})


# == Filings and SEC ==========================================================


@mcp.tool()
async def sec_filings(symbol: str) -> str:
    """Get recent SEC filings for a company, including 10-K, 10-Q, 8-K, and other forms."""
    return await _finnhub_get("stock/filings", {"symbol": symbol})


# == Calendars ================================================================


@mcp.tool()
async def earnings_calendar(from_date: str, to_date: str) -> str:
    """Get upcoming earnings calendar showing companies reporting earnings in a date range. Dates in YYYY-MM-DD format."""
    return await _finnhub_get(
        "calendar/earnings",
        {"from": from_date, "to": to_date},
    )


@mcp.tool()
async def ipo_calendar(from_date: str, to_date: str) -> str:
    """Get upcoming IPO calendar showing companies going public in a date range. Dates in YYYY-MM-DD format."""
    return await _finnhub_get(
        "calendar/ipo",
        {"from": from_date, "to": to_date},
    )


# == Forex and Crypto =========================================================


@mcp.tool()
async def forex_symbols(exchange: str) -> str:
    """Get available forex exchange pairs. Returns a list of supported currency pairs."""
    return await _finnhub_get("forex/symbol", {"exchange": exchange})


@mcp.tool()
async def forex_candles(
    symbol: str,
    resolution: str,
    from_timestamp: int,
    to_timestamp: int,
) -> str:
    """Get forex candles (OHLCV) for a currency pair over a date range. Resolution: 1, 5, 15, 30, 60, D, W, M."""
    return await _finnhub_get(
        "forex/candle",
        {
            "symbol": symbol,
            "resolution": resolution,
            "from": str(from_timestamp),
            "to": str(to_timestamp),
        },
    )


@mcp.tool()
async def crypto_symbols(exchange: str) -> str:
    """Get available crypto exchange pairs for a given exchange."""
    return await _finnhub_get("crypto/symbol", {"exchange": exchange})


@mcp.tool()
async def crypto_candles(
    symbol: str,
    resolution: str,
    from_timestamp: int,
    to_timestamp: int,
) -> str:
    """Get crypto candles (OHLCV) for a cryptocurrency pair over a date range. Resolution: 1, 5, 15, 30, 60, D, W, M."""
    return await _finnhub_get(
        "crypto/candle",
        {
            "symbol": symbol,
            "resolution": resolution,
            "from": str(from_timestamp),
            "to": str(to_timestamp),
        },
    )


# == Economic and Market Status ===============================================


@mcp.tool()
async def market_status(exchange: str) -> str:
    """Get the current trading status of major global exchanges (open, closed, pre-market, etc.)."""
    return await _finnhub_get("stock/market-status", {"exchange": exchange})


@mcp.tool()
async def stock_exchanges() -> str:
    """Get the list of supported stock exchanges."""
    return await _finnhub_get("stock/exchange")


@mcp.tool()
async def stock_symbols(exchange: str) -> str:
    """Get the list of stock symbols for an exchange. Use exchange code from stock_exchanges tool."""
    return await _finnhub_get("stock/symbol", {"exchange": exchange})


@mcp.tool()
async def country_economic_data(code: str) -> str:
    """Get a list of country-level economic indicators and their latest values. Use ISO country code, e.g. 'US', 'GB'."""
    return await _finnhub_get("country", {"code": code})


# == Technical Indicators =====================================================


@mcp.tool()
async def technical_indicator(
    symbol: str,
    resolution: str,
    from_timestamp: int,
    to_timestamp: int,
    indicator: str,
    timeperiod: int = 14,
) -> str:
    """Get technical indicator values (SMA, EMA, RSI, MACD, etc.) for a stock. Resolution: 1, 5, 15, 30, 60, D, W, M."""
    return await _finnhub_get(
        "indicator",
        {
            "symbol": symbol,
            "resolution": resolution,
            "from": str(from_timestamp),
            "to": str(to_timestamp),
            "indicator": indicator,
            "timeperiod": str(timeperiod),
        },
    )


# == Pattern Recognition =====================================================


@mcp.tool()
async def pattern_recognition(symbol: str, resolution: str) -> str:
    """Get recognised candlestick patterns for a stock on a given resolution. Resolution: D, W, M."""
    return await _finnhub_get(
        "scan/pattern", {"symbol": symbol, "resolution": resolution}
    )


# == Insider Transactions =====================================================


@mcp.tool()
async def insider_transactions(symbol: str) -> str:
    """Get insider transactions (buys and sells by company insiders) for a stock."""
    return await _finnhub_get("stock/insider-transactions", {"symbol": symbol})


# == MCP Apps — UI Resource ===================================================


DASHBOARD_RESOURCE_URI = "ui://alpha-analyser/portfolio-dashboard"

_UI_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui")
_DASHBOARD_DIST = os.path.join(_UI_DIR, "portfolio-dashboard", "dist")


async def _read_dashboard_html() -> str:
    """Read the built dashboard HTML asynchronously."""
    html_path = os.path.join(_DASHBOARD_DIST, "index.html")
    async with aiofiles.open(html_path, "r", encoding="utf-8") as f:
        return await f.read()


@mcp.resource(
    DASHBOARD_RESOURCE_URI,
    name="portfolio_dashboard_ui",
    title="Portfolio Dashboard",
    description="Interactive portfolio dashboard widget for Microsoft 365 Copilot Chat",
    mime_type="text/html",
)
async def portfolio_dashboard_ui() -> str:
    """Serve the React-built Portfolio Dashboard HTML widget.

    The build output is a single self-contained HTML file (all JS/CSS
    inlined by vite-plugin-singlefile).  No external asset fetches are
    needed, which eliminates CORS issues inside the M365 widget-renderer
    sandboxed iframe.
    """
    return await _read_dashboard_html()


# == MCP Apps — Portfolio Dashboard Tool ======================================


def _news_date_range(range_code: str) -> tuple[str, str]:
    """Return (from_date, to_date) strings for a human range code."""
    today = datetime.date.today()
    days = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365}
    delta = days.get(range_code.upper(), 30)
    return str(today - datetime.timedelta(days=delta)), str(today)


def _fmt_val(val, prefix="", suffix="", fallback="n/a"):
    """Format a numeric value for display, or return the fallback string."""
    if val is None:
        return fallback
    return f"{prefix}{val:.2f}{suffix}"


def _build_text_summary(dashboard: list[dict], range_code: str) -> str:
    """Build a rich Markdown summary suitable for any MCP client.

    Includes a concise overview sentence, a full stats table, and
    top headlines per ticker — all rendered as standard Markdown so
    the response is useful even when no UI widget is available.
    """
    n = len(dashboard)
    lines: list[str] = []

    # ── Header ──
    lines.append("## Portfolio Dashboard")
    lines.append(
        f"**{n} ticker{'s' if n != 1 else ''}** · News range: {range_code}\n"
    )

    if n == 0:
        lines.append("_No tickers provided._")
        return "\n".join(lines)

    # ── Concise summary sentence ──
    scored = [d for d in dashboard if d.get("changePercent") is not None]
    up = sum(1 for d in scored if d["changePercent"] >= 0)
    parts: list[str] = [f"{up} of {n} up today."]
    if scored:
        top = max(scored, key=lambda d: d["changePercent"])
        bot = min(scored, key=lambda d: d["changePercent"])
        if top["changePercent"] >= 0:
            parts.append(
                f"Top gainer: **{top['symbol']}** "
                f"(+{top['changePercent']:.2f}%)."
            )
        if bot["changePercent"] < 0:
            parts.append(
                f"Largest decliner: **{bot['symbol']}** "
                f"({bot['changePercent']:.2f}%)."
            )
    lines.append(" ".join(parts))

    # ── Per-ticker cards (renders better in narrow chat than wide tables) ──
    for d in dashboard:
        pos = (d.get("change") or 0) >= 0
        sign = "+" if pos else ""
        arrow = "📈" if pos else "📉"
        lines.append("")
        lines.append(f"### {arrow} {d['symbol']}")
        lines.append("")
        lines.append(
            f"**{_fmt_val(d['price'], '$')}** "
            f"({_fmt_val(d['change'], sign)} / "
            f"{_fmt_val(d['changePercent'], sign, '%')})"
        )
        lines.append("")
        lines.append(
            f"| Open | High | Low | Prev Close |"
        )
        lines.append(
            f"|-----:|-----:|----:|-----------:|"
        )
        lines.append(
            f"| {_fmt_val(d['open'], '$')} "
            f"| {_fmt_val(d['high'], '$')} "
            f"| {_fmt_val(d['low'], '$')} "
            f"| {_fmt_val(d['prevClose'], '$')} |"
        )
        # Inline headlines
        if d["news"]:
            lines.append("")
            for article in d["news"]:
                hl = article["headline"]
                url = article.get("url")
                lines.append(f"- [{hl}]({url})" if url else f"- {hl}")

    return "\n".join(lines)


@mcp.tool(
    meta={
        "ui": {
            "resourceUri": DASHBOARD_RESOURCE_URI,
            "description": "Renders an interactive portfolio dashboard widget",
        }
    },
)
async def show_portfolio_dashboard(
    tickers: list[str], range: str = "1M"
) -> CallToolResult:
    """Show a Portfolio Dashboard for a list of ticker symbols.

    Displays current price, daily change, and latest news headlines for
    each ticker.  The response includes:
      * A human-readable Markdown summary (works in **any** MCP client).
      * ``structuredContent`` matching the ``DashboardPayload`` schema so
        MCP Apps-aware hosts can render the companion widget.

    Args:
        tickers: List of stock ticker symbols, e.g. ["AAPL", "MSFT", "GOOGL"].
        range:   News lookback period.  One of 1D, 1W, 1M, 3M, 6M, 1Y.
                 Defaults to "1M".
    """
    from_date, to_date = _news_date_range(range)

    # Validate and deduplicate tickers upfront
    valid_tickers: list[str] = []
    for sym in tickers:
        try:
            valid_tickers.append(_validate_ticker(sym))
        except ValueError:
            continue
    valid_tickers = list(dict.fromkeys(valid_tickers))  # dedupe, preserve order

    # Sparkline: 7 days of daily close prices
    today = datetime.date.today()
    spark_from = str(int(datetime.datetime.combine(
        today - datetime.timedelta(days=7), datetime.time.min,
    ).timestamp()))
    spark_to = str(int(datetime.datetime.combine(
        today, datetime.time.min,
    ).timestamp()))

    # Semaphore to avoid hitting Finnhub free-tier rate limits.
    _sem = asyncio.Semaphore(2)

    async def _safe_get(path: str, params: dict[str, str]) -> str | None:
        """Finnhub GET that returns None on error instead of raising."""
        try:
            async with _sem:
                return await _finnhub_get(path, params)
        except Exception:
            return None

    async def _fetch_ticker(sym: str) -> dict:
        """Fetch quote + news + sparkline for a single ticker, resilient to errors."""
        q_raw, news_raw, candle_raw = await asyncio.gather(
            _safe_get("quote", {"symbol": sym}),
            _safe_get(
                "company-news",
                {"symbol": sym, "from": from_date, "to": to_date},
            ),
            _safe_get(
                "stock/candle",
                {
                    "symbol": sym,
                    "resolution": "D",
                    "from": spark_from,
                    "to": spark_to,
                },
            ),
        )

        q = json.loads(q_raw) if q_raw else {}
        news = json.loads(news_raw) if news_raw else []
        candle = json.loads(candle_raw) if candle_raw else {}

        # Extract close prices for sparkline
        sparkline: list[float] = []
        if isinstance(candle, dict) and candle.get("s") == "ok":
            sparkline = candle.get("c", [])

        return {
            "symbol": sym,
            "price": q.get("c"),
            "change": q.get("d"),
            "changePercent": q.get("dp"),
            "open": q.get("o"),
            "high": q.get("h"),
            "low": q.get("l"),
            "prevClose": q.get("pc"),
            "sparkline": sparkline,
            "news": [
                {"headline": n.get("headline"), "url": n.get("url")}
                for n in (news[:3] if isinstance(news, list) else [])
            ],
        }

    # Fetch all tickers in parallel
    dashboard = await asyncio.gather(*[_fetch_ticker(s) for s in valid_tickers])
    dashboard = list(dashboard)

    text_summary = _build_text_summary(dashboard, range)

    return CallToolResult(
        content=[TextContent(type="text", text=text_summary)],
        structuredContent={"dashboard": dashboard},
    )

# == CORS origin computation ==================================================
#
# Microsoft 365 Copilot renders MCP App widgets inside a sandboxed iframe
# hosted at:
#
#     https://{hash}.widget-renderer.usercontent.microsoft.com
#
# where {hash} is a SHA-256 of the MCP server domain.  We compute the
# allowed origin at startup so it stays in sync with the configured
# AZURE_HOST.
#
# To override the widget-renderer origin (e.g. in a staging environment),
# set the WIDGET_RENDERER_ORIGIN environment variable to the full origin:
#
#     WIDGET_RENDERER_ORIGIN=https://abc123.widget-renderer.usercontent.microsoft.com
#

def _compute_widget_renderer_origin(server_domain: str) -> str:
    """Derive the M365 widget-renderer origin for *server_domain*.

    The host format is ``{sha256-hex}.widget-renderer.usercontent.microsoft.com``.
    """
    domain_hash = hashlib.sha256(server_domain.encode()).hexdigest()
    return f"https://{domain_hash}.widget-renderer.usercontent.microsoft.com"


def _build_allowed_origins() -> list[str]:
    """Return the list of origins the CORS middleware should accept.

    Sources (in priority order):
      1. WIDGET_RENDERER_ORIGIN env var    – explicit override
      2. Computed from AZURE_HOST           – auto-derived hash
      3. The server's own https:// origin   – for same-origin requests
      4. http://localhost:*                  – local development
    """
    origins: list[str] = []

    # 1. Explicit override (e.g. for staging / custom domains)
    explicit = os.environ.get("WIDGET_RENDERER_ORIGIN", "").strip()
    if explicit:
        origins.append(explicit)

    # 2. Auto-derived from the server domain
    origins.append(_compute_widget_renderer_origin(AZURE_HOST))

    # 3. The server's own origin
    origins.append(f"https://{AZURE_HOST}")

    # 4. Local development
    origins.append("http://localhost:5173")   # Vite dev server
    origins.append("http://localhost:8000")   # local uvicorn

    return origins


# == Entrypoint ===============================================================

if __name__ == "__main__":
    import uvicorn
    from starlette.middleware.cors import CORSMiddleware
    from starlette.responses import HTMLResponse, JSONResponse
    from starlette.routing import Route

    # --- Allowed origins (computed once at startup) ---
    _allowed_origins = _build_allowed_origins()

    async def health(request):
        return JSONResponse({"status": "healthy", "server": "AlphaAnalyzerMCP"})

    async def serve_dashboard_ui(request):
        """Serve the self-contained React dashboard HTML with security headers."""
        html = await _read_dashboard_html()
        return HTMLResponse(
            content=html,
            headers={
                "Content-Type": "text/html; charset=utf-8",
                "X-Content-Type-Options": "nosniff",
                # Allow framing by the widget-renderer, but no one else.
                "Content-Security-Policy": (
                    "frame-ancestors 'self' "
                    "https://*.widget-renderer.usercontent.microsoft.com"
                ),
                "Cache-Control": "no-cache",
            },
        )

    # --- Build the Starlette app ---
    app = mcp.streamable_http_app()

    # Health check
    app.routes.insert(0, Route("/health", health))

    # Serve the dashboard HTML at /ui
    app.routes.insert(1, Route("/ui", serve_dashboard_ui))

    # --- CORS ---
    # Locked to the computed widget-renderer origin, the server's own
    # origin, and localhost for dev.  NOT allow_origins=["*"].
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Accept",
            "mcp-session-id",
        ],
        expose_headers=["mcp-session-id"],
        max_age=600,
    )

    # --- Log startup info ---
    port = int(os.environ.get("PORT", "8000"))
    print(f"CORS allowed origins: {_allowed_origins}")
    print(f"Dashboard UI: http://0.0.0.0:{port}/ui")

    uvicorn.run(app, host="0.0.0.0", port=port)
