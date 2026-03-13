# Portfolio Dashboard UI

React + Fluent UI v9 widget for the AlphaAnalyzerMCP portfolio dashboard.

## Prerequisites

- [Node.js 18+](https://nodejs.org/)

## Install

```bash
cd ui/portfolio-dashboard
npm install
```

## Develop

```bash
npm run dev
```

Opens a Vite dev server at http://localhost:5173.

## Build for production

```bash
npm run build
```

Output is written to `dist/` — a static `index.html` plus a JS bundle in
`dist/assets/`.  The Python MCP server serves these files:

- `GET /ui` — the dashboard HTML page
- `GET /ui/assets/*` — the JS bundle (static files)

The MCP resource handler at `ui://alpha-analyser/portfolio-dashboard` also
returns the `dist/index.html` content for MCP Apps hosts that render UI
inside a sandboxed iframe.

## How it works

1. On mount, the React app checks for the OpenAI Apps SDK
   (`window.openai`) using capability detection.
2. If the SDK is present, it reads tool inputs (`tickers`, `range`) and
   tool output (`structuredContent`) from the host.
3. If not, it falls back to reading bootstrap JSON from a
   `<script id="dashboard-data">` element that the server can inject.
4. The Refresh button calls `window.openai.callTool()` if available;
   otherwise it shows a message telling the user to rerun the command.