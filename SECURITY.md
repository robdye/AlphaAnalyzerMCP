# Security

## Reporting Vulnerabilities

Please do **not** report security vulnerabilities through public GitHub issues.
If you discover a vulnerability, follow the guidance at
[https://aka.ms/SECURITY.md](https://aka.ms/SECURITY.md).

---

## UI Widgets and Security

AlphaAnalyzerMCP serves an interactive React widget inside Microsoft 365
Copilot Chat.  This section documents the security boundaries that protect
the widget, the MCP server, and the end-user's browser.

### Widget-renderer origin and CORS

When M365 Copilot renders a widget returned by an MCP tool, it loads the
HTML inside a **sandboxed iframe** hosted at a dedicated origin:

```
https://{sha256-of-server-domain}.widget-renderer.usercontent.microsoft.com
```

The hash is derived from the MCP server's public domain name (the value of
`WEBSITE_HOSTNAME` on Azure App Service).  Because the iframe origin differs
from the MCP server origin, every sub-resource request the widget makes
(JavaScript, CSS, API calls) is a **cross-origin request** and is blocked
by the browser unless the server explicitly allows it.

This server computes the expected widget-renderer origin at startup and
passes it — along with the server's own origin and localhost for local
development — to the Starlette CORS middleware.  Only those origins are
permitted; `Access-Control-Allow-Origin: *` is never used.

The `Content-Security-Policy` header on the HTML response further restricts
framing to `'self'` and `https://*.widget-renderer.usercontent.microsoft.com`,
preventing click-jacking from any other origin.

If you deploy to a custom domain or staging environment, set the
`WIDGET_RENDERER_ORIGIN` environment variable to the exact origin shown
in the browser console error.  The CSP `connect-src` and `frame-ancestors`
directives do **not** support wildcards for the hash portion — the value
must be precise.

### Authentication

Microsoft's guidance for MCP servers connected to M365 Copilot supports
the following authentication models in the declarative-agent manifest
(`ai-plugin.json`):

| Auth type | When to use |
|-----------|-------------|
| **None** | Local development and public read-only data only. The Microsoft samples (`microsoft/mcp-interactiveUI-samples`) ship with `"auth": { "type": "None" }` because they are starter templates. |
| **OAuth 2.1 (Authorization Code + PKCE)** | Production servers that call user-scoped APIs. The Agents Toolkit prompts for OAuth configuration during provisioning. |
| **Microsoft Entra SSO** | Production servers in Microsoft 365 tenants. Provides single sign-on via the Copilot host token and avoids a separate consent flow. |
| **API Key** | Simple server-to-server scenarios where a shared secret is acceptable. |

> **Anonymous access (`"type": "None"`) must only be used during
> development.**  Before deploying to production, configure OAuth 2.1 or
> Entra SSO in the manifest so that Copilot authenticates with the MCP
> server on every request.

This server currently uses anonymous access because the only external
dependency — the Finnhub API — is authenticated server-side via the
`FINNHUB_API_KEY` environment variable.  Adding Entra SSO requires:

1. Registering an app in Microsoft Entra ID.
2. Adding `"auth": { "type": "OAuthSso", ... }` to `ai-plugin.json`.
3. Validating the bearer token in a Starlette middleware before the MCP
   handler runs.

### Secrets and the browser boundary

The UI widget runs in an **untrusted browser context** (a sandboxed iframe
with a unique origin).  The following rules apply:

1. **Never embed API keys, tokens, or secrets in widget HTML or
   JavaScript.**  The Finnhub API key exists only in the server process
   environment (`FINNHUB_API_KEY`).  It is never serialised into tool
   responses, `structuredContent`, or the HTML resource.

2. **Widgets must call back into MCP tools for any data that requires
   authentication.**  The host SDK exposes `window.openai.callTool()`
   (OpenAI Apps SDK) or `app.callServerTool()` (MCP Apps) so the widget
   can invoke server-side tools without possessing credentials.  The
   server authenticates the call; the browser never sees the secret.

3. **Tool responses should contain only the data the widget needs to
   render.**  The `structuredContent` returned by
   `show_portfolio_dashboard` includes prices and headlines — not API
   keys, session tokens, or internal identifiers.

4. **Static assets served to the widget (JS, CSS) must not contain
   secrets.**  The Vite build output in `ui/portfolio-dashboard/dist/`
   is public code.  Environment variables are **not** inlined during the
   build.
