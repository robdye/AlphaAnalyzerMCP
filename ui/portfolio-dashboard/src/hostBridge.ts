/**
 * hostBridge.ts — single module for all host/SDK interactions.
 *
 * Every access to `window.openai` is guarded by a capability check so
 * the widget renders safely both inside an MCP Apps host (M365 Copilot
 * Chat with the OpenAI Apps SDK injected) and as a standalone page.
 *
 * Public API:
 *   getToolInput()   – returns the tool input payload, or null
 *   getToolResult()  – returns the tool result payload, or null
 *   callTool()       – invokes a tool via the host, or throws
 *   setWidgetState() – persists minimal UI state, or no-ops
 *   capabilities     – read-only snapshot of what the host supports
 */

import type { DashboardPayload, ToolInputs, WidgetState } from "./types";

// ---------------------------------------------------------------------------
//  Ambient type for the OpenAI Apps SDK global
// ---------------------------------------------------------------------------

interface OpenAIAppsSDK {
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  getToolInput?: () => unknown;
  getToolOutput?: () => unknown;
  setWidgetState?: (state: Record<string, unknown>) => void;
  getWidgetState?: () => unknown;
}

declare global {
  interface Window {
    openai?: OpenAIAppsSDK;
  }
}

// ---------------------------------------------------------------------------
//  Capability detection (evaluated once at import time)
// ---------------------------------------------------------------------------

/** True when the SDK global exists at all. */
function sdkPresent(): boolean {
  return typeof window !== "undefined"
    && typeof window.openai !== "undefined"
    && window.openai !== null;
}

/**
 * Read-only capability flags.  Components can use these to decide what
 * UI to show without importing individual check functions.
 */
export const capabilities = Object.freeze({
  /** Host can invoke MCP tools on our behalf. */
  get callTool(): boolean {
    return sdkPresent() && typeof window.openai!.callTool === "function";
  },
  /** Host can supply the original tool input (tickers, range). */
  get toolInput(): boolean {
    return sdkPresent() && typeof window.openai!.getToolInput === "function";
  },
  /** Host can supply the tool result (structuredContent). */
  get toolResult(): boolean {
    return sdkPresent() && typeof window.openai!.getToolOutput === "function";
  },
  /** Host can persist and restore small widget state blobs. */
  get widgetState(): boolean {
    return sdkPresent()
      && typeof window.openai!.setWidgetState === "function"
      && typeof window.openai!.getWidgetState === "function";
  },
  /** Convenience: true when *any* SDK surface is available. */
  get connected(): boolean {
    return sdkPresent();
  },
});

// ---------------------------------------------------------------------------
//  getToolInput
// ---------------------------------------------------------------------------

/**
 * Return the tool input payload the host used to invoke
 * `show_portfolio_dashboard`, or `null` if unavailable.
 */
export function getToolInput(): ToolInputs | null {
  if (!capabilities.toolInput) return null;

  try {
    const raw = window.openai!.getToolInput!();
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      // Normalise: tickers may arrive as string[] or comma-separated string.
      let tickers: string[];
      if (Array.isArray(obj.tickers)) {
        tickers = obj.tickers as string[];
      } else if (typeof obj.tickers === "string") {
        tickers = (obj.tickers as string).split(",").map((s) => s.trim()).filter(Boolean);
      } else {
        tickers = [];
      }
      const range = typeof obj.range === "string" ? obj.range : "1M";
      return { tickers, range };
    }
  } catch (err) {
    console.warn("[hostBridge] getToolInput failed:", err);
  }
  return null;
}

// ---------------------------------------------------------------------------
//  getToolResult
// ---------------------------------------------------------------------------

/**
 * Return the structured tool result (the `DashboardPayload` JSON)
 * produced by `show_portfolio_dashboard`, or `null` if unavailable.
 *
 * Handles three formats:
 *   1. Full CallToolResult wrapper with `structuredContent.dashboard`.
 *   2. The host already parsed it into an object with a `dashboard` key.
 *   3. The raw tool string "summary…\n---DATA---\n{json}" (legacy).
 */
export function getToolResult(): DashboardPayload | null {
  if (!capabilities.toolResult) return null;

  try {
    const raw = window.openai!.getToolOutput!();

    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;

      // Case 1 — full CallToolResult wrapper with structuredContent
      if (
        "structuredContent" in obj &&
        obj.structuredContent &&
        typeof obj.structuredContent === "object"
      ) {
        const sc = obj.structuredContent as Record<string, unknown>;
        if ("dashboard" in sc) {
          return sc as unknown as DashboardPayload;
        }
      }

      // Case 2 — already the DashboardPayload object
      if ("dashboard" in obj) {
        return obj as unknown as DashboardPayload;
      }
    }

    // Case 3 — raw string with DATA marker (legacy)
    if (typeof raw === "string") {
      const marker = "---DATA---\n";
      const idx = raw.indexOf(marker);
      const jsonStr = idx >= 0 ? raw.slice(idx + marker.length) : raw;
      return JSON.parse(jsonStr) as DashboardPayload;
    }
  } catch (err) {
    console.warn("[hostBridge] getToolResult failed:", err);
  }
  return null;
}

// ---------------------------------------------------------------------------
//  callTool
// ---------------------------------------------------------------------------

/**
 * Error thrown when `callTool` is invoked but the host does not expose
 * the capability.  UI code should catch this and show a friendly hint.
 */
export class HostUnavailableError extends Error {
  constructor() {
    super(
      "The host does not support calling tools from the widget. "
      + "Please rerun the show_portfolio_dashboard command in chat.",
    );
    this.name = "HostUnavailableError";
  }
}

/**
 * Invoke an MCP tool via the host.
 *
 * @throws {HostUnavailableError} if `window.openai.callTool` is absent.
 *
 * For `show_portfolio_dashboard` the result may arrive as:
 *   - A CallToolResult with `structuredContent` (preferred).
 *   - A pre-parsed object with a `dashboard` key.
 *   - A legacy string with a ``---DATA---`` marker.
 */
export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  // --- capability gate ---
  if (!capabilities.callTool) {
    throw new HostUnavailableError();
  }

  const raw = await window.openai!.callTool!(name, args);

  // Prefer structuredContent when present (new format).
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (
      "structuredContent" in obj &&
      obj.structuredContent &&
      typeof obj.structuredContent === "object"
    ) {
      return obj.structuredContent;
    }
  }

  // Legacy: extract JSON from the ---DATA--- marker string.
  if (typeof raw === "string" && raw.includes("---DATA---\n")) {
    const marker = "---DATA---\n";
    const idx = raw.indexOf(marker);
    return JSON.parse(raw.slice(idx + marker.length));
  }

  return raw;
}

// ---------------------------------------------------------------------------
//  setWidgetState / getWidgetState
// ---------------------------------------------------------------------------

/**
 * Persist a *minimal* UI state snapshot via the host.
 *
 * Intentionally limited to scalar flags — never store the full dashboard
 * payload here.  If the host does not support widget state this is a
 * silent no-op.
 */
export function setWidgetState(state: WidgetState): void {
  if (!capabilities.widgetState) return; // silent fallback

  try {
    // Only persist the fields defined in WidgetState — keep it small.
    const minimal: Record<string, unknown> = {
      selectedTicker: state.selectedTicker,
      range: state.range,
    };
    window.openai!.setWidgetState!(minimal);
  } catch (err) {
    console.warn("[hostBridge] setWidgetState failed:", err);
  }
}

/**
 * Restore the previously persisted widget state, or `null`.
 */
export function getWidgetState(): WidgetState | null {
  if (!capabilities.widgetState) return null;

  try {
    const raw = window.openai!.getWidgetState!();
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      return {
        selectedTicker: typeof obj.selectedTicker === "string" ? obj.selectedTicker : null,
        range: typeof obj.range === "string" ? obj.range : "1M",
      };
    }
  } catch (err) {
    console.warn("[hostBridge] getWidgetState failed:", err);
  }
  return null;
}

// ---------------------------------------------------------------------------
//  Bootstrap fallback (no SDK)
// ---------------------------------------------------------------------------

/**
 * Read data injected by the Python server into a `<script>` tag.
 * Used when the widget is rendered outside an MCP Apps host.
 */
export function readBootstrapData(): DashboardPayload | null {
  const el = document.getElementById("dashboard-data");
  if (!el?.textContent) return null;
  try {
    const parsed: unknown = JSON.parse(el.textContent);
    if (parsed && typeof parsed === "object" && "dashboard" in parsed) {
      return parsed as DashboardPayload;
    }
  } catch {
    /* malformed JSON — ignore */
  }
  return null;
}