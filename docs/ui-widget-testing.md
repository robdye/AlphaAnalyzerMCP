# UI Widget Local Validation Guide

Step-by-step runbook for verifying the MCP server, the
`show_portfolio_dashboard` tool, and the companion React widget locally.

---

## 1. Start the MCP server

```bash
# From the repo root
export FINNHUB_API_KEY="<your-key>"   # required
python server.py                       # starts on http://0.0.0.0:8000
```

Confirm it is running:

```bash
curl http://localhost:8000/health
# → {"status":"healthy","server":"AlphaAnalyzerMCP"}
```

---

## 2. Connect with MCP Inspector

1. Open **MCP Inspector** (`npx @anthropic-ai/mcp-inspector` or the VS Code extension).
2. Set the transport to **Streamable HTTP**.
3. Enter the server URL: `http://localhost:8000/mcp`
4. Click **Connect**. The session ID header is handled automatically.

### List tools

In the Inspector sidebar click **Tools**. You should see every
`@mcp.tool()` the server registers, including `show_portfolio_dashboard`.

### Call `show_portfolio_dashboard`

Use the **Call Tool** pane:

| Field   | Value                                |
|---------|--------------------------------------|
| Name    | `show_portfolio_dashboard`           |
| Args    | `{"tickers":["AAPL","MSFT"],"range":"1W"}` |

Click **Send**. The response must contain:

* **`content`** — a `TextContent` block with a Markdown summary (header,
  stats table, headlines). This is the plain-client fallback.
* **`structuredContent`** — a JSON object `{ "dashboard": [ ... ] }` whose
  entries match the `TickerData` TypeScript interface.

---

## 3. Verify tool metadata and UI resource

### `_meta.ui.resourceUri`

In the Inspector tool listing, expand `show_portfolio_dashboard` and
inspect the raw JSON. Confirm:

```jsonc
"meta": {
  "ui": {
    "resourceUri": "ui://alpha-analyser/portfolio-dashboard",
    "description": "Renders an interactive portfolio dashboard widget"
  }
}
```

### Fetch the `ui://` resource

In the **Resources** tab, look for `ui://alpha-analyser/portfolio-dashboard`.
Read it — the server returns the built React HTML with asset URLs rewritten
to absolute paths (`https://<AZURE_HOST>/ui/assets/…`).

For local testing the HTML is also served at:

```
http://localhost:8000/ui
```

Open that URL in a browser; the dashboard should render (it will show
the "Waiting for portfolio data" empty state since there is no host SDK).

---

## 4. Troubleshooting

### CORS errors in the browser console

| Symptom | Fix |
|---------|-----|
| `Access-Control-Allow-Origin` missing | Ensure you are hitting `localhost:8000`. The server allows `http://localhost:5173` (Vite) and `http://localhost:8000`. |
| Widget-renderer origin blocked | Set `WIDGET_RENDERER_ORIGIN` env var to the exact origin shown in the error, or verify `WEBSITE_HOSTNAME` is correct. |

**Tip:** The allowed origins are logged at server startup — check the
terminal output.

### Missing JS/CSS assets (404)

1. Make sure the React app has been built:
   ```bash
   cd ui/portfolio-dashboard && npm run build
   ```
2. Verify `ui/portfolio-dashboard/dist/assets/` contains `.js` and
   optionally `.css` files.
3. The server mounts that directory at `/ui/assets/` — open
   `http://localhost:8000/ui/assets/` and confirm files are listed.

### `structuredContent` missing from response

* Ensure `mcp >= 1.6.0` is installed (`pip show mcp`).
* The tool must return a `CallToolResult` object, **not** a plain string.
* In MCP Inspector, switch to the **Raw JSON** view of the response to
  confirm both `content` and `structuredContent` keys are present.

### Widget shows "Waiting for portfolio data…"

This is expected when opened outside an MCP Apps host.  The widget needs
either:
* The OpenAI Apps SDK (`window.openai`) to supply tool output, or
* A `<script id="dashboard-data">` bootstrap block in the HTML.

To manually test with data, paste the `structuredContent` JSON from
Inspector into a `<script id="dashboard-data" type="application/json">`
tag inside `dist/index.html`.
