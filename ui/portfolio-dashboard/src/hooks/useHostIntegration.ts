import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardPayload, ToolInputs } from "../types";
import {
  callTool,
  capabilities,
  getToolInput,
  getToolResult,
  getWidgetState,
  HostUnavailableError,
  readBootstrapData,
  setWidgetState,
} from "../hostBridge";

export interface HostState {
  /** The dashboard data to render. */
  data: DashboardPayload | null;
  /** Tool inputs from the host (tickers + range). */
  inputs: ToolInputs | null;
  /** Currently selected ticker (persisted to widget state). */
  selectedTicker: string | null;
  /** True while a refresh call is in flight. */
  loading: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Whether the host supports callTool for refresh. */
  canRefresh: boolean;
  /** Select a ticker and persist the choice to widget state. */
  selectTicker: (symbol: string | null) => void;
  /** Trigger a refresh via the host SDK. */
  refresh: () => void;
}

/**
 * Central hook that wires the React UI to the host environment.
 *
 * On mount it tries three data sources in priority order:
 *   1. Host SDK tool result  (getToolResult)
 *   2. Host SDK tool input   (getToolInput — only sets inputs, no data)
 *   3. Bootstrap JSON in the HTML (<script id="dashboard-data">)
 *
 * It also restores minimal widget state (selected ticker, range) from
 * the host if available, and persists changes back via setWidgetState.
 */
export function useHostIntegration(): HostState {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [inputs, setInputs] = useState<ToolInputs | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to inputs so the refresh callback always sees the latest
  // value without needing it in the dependency array.
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  // ── Mount: resolve initial data + restore widget state ──────────
  useEffect(() => {
    // 1. Try host SDK tool result
    const hostResult = getToolResult();
    if (hostResult) {
      setData(hostResult);
    }

    // 2. Try host SDK tool input (so we know what to refresh later)
    const hostInputs = getToolInput();
    if (hostInputs) {
      setInputs(hostInputs);
    }

    // 3. Fallback: bootstrap data from the HTML
    if (!hostResult) {
      const bootstrap = readBootstrapData();
      if (bootstrap) {
        setData(bootstrap);
      }
    }

    // 4. Restore persisted widget state (selected ticker, range)
    const saved = getWidgetState();
    if (saved) {
      setSelectedTicker(saved.selectedTicker);
      // If the host had a saved range, merge it into inputs
      if (saved.range && hostInputs) {
        setInputs({ ...hostInputs, range: saved.range });
      }
    }
  }, []);

  // ── Persist widget state on every selection / range change ──────
  const selectTicker = useCallback(
    (symbol: string | null) => {
      setSelectedTicker(symbol);
      setWidgetState({
        selectedTicker: symbol,
        range: inputsRef.current?.range ?? "1M",
      });
    },
    [],
  );

  // ── Refresh via callTool ────────────────────────────────────────
  const refresh = useCallback(() => {
    const tickers = inputsRef.current?.tickers ?? [];
    const range = inputsRef.current?.range ?? "1M";

    if (tickers.length === 0) {
      setError("No tickers to refresh.");
      return;
    }

    setLoading(true);
    setError(null);

    // callTool throws HostUnavailableError when the SDK is absent —
    // we catch it and surface a friendly message.
    callTool("show_portfolio_dashboard", { tickers, range })
      .then((result) => {
        if (result && typeof result === "object" && "dashboard" in result) {
          setData(result as DashboardPayload);
        } else {
          setError("Refresh returned unexpected data.");
        }
      })
      .catch((err: unknown) => {
        if (err instanceof HostUnavailableError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : "Refresh failed.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return {
    data,
    inputs,
    selectedTicker,
    loading,
    error,
    canRefresh: capabilities.callTool,
    selectTicker,
    refresh,
  };
}