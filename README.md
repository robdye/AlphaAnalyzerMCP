# AlphaAnalyzerMCP

A **Model Context Protocol (MCP)** server built with **Python FastMCP** that exposes all [Finnhub.io](https://finnhub.io) free-tier API endpoints as tools for use in Copilot Studio.

The Finnhub API key is stored as a secure **Azure App Setting** (`FINNHUB_API_KEY`) so it is never exposed to callers or hard-coded in source.

---

## Tools

| Tool | Description |
|------|-------------|
| **symbol_search** | Look up stock symbols by company name |
| **company_profile** | Company name, market cap, industry, logo |
| **company_peers** | Similar companies in the same industry |
| **basic_financials** | Revenue, earnings, margins, and ratios |
| **quote** | Real-time price, change, high, low, open, close |
| **stock_candles** | OHLCV candlestick data over a date range |
| **recommendation_trends** | Analyst buy, hold, sell recommendations |
| **price_target** | Consensus analyst price targets |
| **earnings_surprises** | Actual vs estimated EPS for recent quarters |
| **company_news** | Latest news articles for a company |
| **market_news** | General market, forex, crypto, and merger news |
| **news_sentiment** | News sentiment and buzz statistics |
| **sec_filings** | Recent SEC filings (10-K, 10-Q, 8-K, etc.) |
| **earnings_calendar** | Upcoming earnings reports in a date range |
| **ipo_calendar** | Upcoming IPOs in a date range |
| **forex_symbols** | Available forex currency pairs |
| **forex_candles** | Forex OHLCV candlestick data |
| **crypto_symbols** | Available cryptocurrency pairs |
| **crypto_candles** | Crypto OHLCV candlestick data |
| **market_status** | Exchange trading status (open, closed, pre-market) |
| **stock_exchanges** | List of supported stock exchanges |
| **stock_symbols** | Stock symbols for a given exchange |
| **country_economic_data** | Country-level economic indicators |
| **technical_indicator** | SMA, EMA, RSI, MACD, and other indicators |
| **pattern_recognition** | Candlestick pattern detection |
| **insider_transactions** | Insider buys and sells |

---

## Quick Start

### Prerequisites

- [Python 3.11+](https://www.python.org/downloads/)
- A free [Finnhub API key](https://finnhub.io/register)

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Locally

```bash
export FINNHUB_API_KEY="your_key_here"
python server.py
```

On Windows PowerShell:

```powershell
$env:FINNHUB_API_KEY = "your_key_here"
python server.py
```

The MCP server starts on `http://localhost:8000` with SSE transport.

### Verify the Server

The MCP SSE endpoint is available at:

```
http://localhost:8000/sse
```

Health check:

```
http://localhost:8000/health
```

---

## API Key — Secure App Setting

The Finnhub API key is stored as the `FINNHUB_API_KEY` **Azure App Setting**.
It is read server-side and never exposed to callers.

- Locally: set the `FINNHUB_API_KEY` environment variable.
- Azure: set via the deployment script or the Azure Portal under
  **Configuration > Application settings**.

Get a free key at [finnhub.io/register](https://finnhub.io/register).

---

## Copilot Studio Configuration

Once deployed, connect the MCP server in Copilot Studio:

1. Open [Copilot Studio](https://copilotstudio.microsoft.com)
2. Go to **Actions** > **Add an action** > **MCP Server**
3. Enter the SSE URL: `https://alphaanalyzer-mcp.azurewebsites.net/sse`
4. No `api_key` input is needed — the key is stored securely on the server

---

## Project Structure

```
AlphaAnalyzerMCP/
    server.py                   - FastMCP server with all Finnhub tool definitions
    requirements.txt            - Python dependencies
    Deploy-AlphaAnalyzerMCP.ps1 - Automated Azure deployment script
```

---

## Deployment to Azure

The included PowerShell script automates the full deployment:

```powershell
.\Deploy-AlphaAnalyzerMCP.ps1 -FinnhubApiKey "your_key_here"
```

This will:
- Package the Python application
- Create an Azure resource group, App Service plan, and Web App
- Store `FINNHUB_API_KEY` as a secure App Setting
- Configure the Python runtime, WebSockets, and Always On
- Deploy the package and output the SSE endpoint URL

### Custom parameters

```powershell
.\Deploy-AlphaAnalyzerMCP.ps1 -AppName "my-mcp-server" -Location "westeurope" -SkuName "B2" -FinnhubApiKey "your_key_here"
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `-ResourceGroup` | `rg-alphaanalyzer-mcp` | Azure resource group name |
| `-AppName` | `alphaanalyzer-mcp` | Web App name (globally unique) |
| `-Location` | `westeurope` | Azure region |
| `-SkuName` | `B1` | App Service plan SKU |
| `-FinnhubApiKey` | *(empty)* | Finnhub API key to store securely |

### Update the API key later

```powershell
az webapp config appsettings set --name alphaanalyzer-mcp --resource-group rg-alphaanalyzer-mcp --settings "FINNHUB_API_KEY=your_new_key"
```

---

## Technology

- **Python 3.11+** - Runtime
- **FastMCP** (`mcp` package) - Official Python MCP SDK with SSE transport
- **httpx** - Async HTTP client for Finnhub API calls
- **Finnhub.io** - Free-tier financial data API
