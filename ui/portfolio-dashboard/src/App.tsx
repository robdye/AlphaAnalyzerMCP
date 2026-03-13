import { useState } from "react";
import {
  FluentProvider,
  webDarkTheme,
  webLightTheme,
  makeStyles,
  Text,
  tokens,
  Card,
  Badge,
} from "@fluentui/react-components";
import {
  ArrowTrendingRegular,
  ArrowUpRegular,
  ArrowDownRegular,
} from "@fluentui/react-icons";
import { TickerCard } from "./components/TickerCard";
import { TickerDetailPanel } from "./components/TickerDetailPanel";
import { SkeletonCard } from "./components/SkeletonCard";
import {
  SortFilterBar,
  sortTickers,
  type SortKey,
  type SortDir,
} from "./components/SortFilterBar";
import { useHostIntegration } from "./hooks/useHostIntegration";
import type { TickerData } from "./types";

const useStyles = makeStyles({
  page: {
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    fontFamily: tokens.fontFamilyBase,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  titleIcon: {
    fontSize: "24px",
    color: tokens.colorBrandForeground1,
  },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
    marginBottom: "16px",
  },
  kpiCard: {
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  kpiLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  kpiValue: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
    fontVariantNumeric: "tabular-nums",
  },
  body: {
    display: "flex",
    flex: 1,
    gap: "0",
    overflow: "hidden",
  },
  grid: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "10px",
    overflowY: "auto",
    paddingRight: "4px",
    alignContent: "start",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: "12px",
    padding: "48px",
    textAlign: "center",
  },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
});

function computeKpis(tickers: TickerData[]) {
  const scored = tickers.filter((t) => t.changePercent !== null);
  const up = scored.filter((t) => t.changePercent! >= 0).length;
  const down = scored.length - up;
  const top = scored.length > 0 ? scored.reduce((a, b) => (a.changePercent! > b.changePercent! ? a : b)) : null;
  const bot = scored.length > 0 ? scored.reduce((a, b) => (a.changePercent! < b.changePercent! ? a : b)) : null;
  return { up, down, top, bot, total: tickers.length };
}

export default function App() {
  const classes = useStyles();
  const {
    data,
    selectedTicker,
    loading,
    error,
    canRefresh,
    selectTicker,
    refresh,
  } = useHostIntegration();

  // Detect host theme — default to dark
  const hostTheme = typeof window !== "undefined" && (window as any).openai?.theme;
  const theme = hostTheme === "light" ? webLightTheme : webDarkTheme;

  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rawTickers = data?.dashboard ?? [];
  const tickers = sortTickers(rawTickers, sortKey, sortDir);
  const selectedData = tickers.find((t) => t.symbol === selectedTicker) ?? null;
  const kpis = computeKpis(tickers);

  return (
    <FluentProvider theme={theme}>
      <div className={classes.page}>
        {/* Header */}
        <div className={classes.header}>
          <ArrowTrendingRegular className={classes.titleIcon} />
          <Text as="h1" size={500} weight="semibold">
            Portfolio Dashboard
          </Text>
          {data && (
            <Badge appearance="tint" color="informative" size="medium">
              {kpis.total} ticker{kpis.total !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Empty / Loading states */}
        {!data && !loading && (
          <div className={classes.empty}>
            <ArrowTrendingRegular style={{ fontSize: 48, opacity: 0.3 }} />
            <Text size={400} italic>
              Waiting for portfolio data…
            </Text>
            <Text size={200}>
              Ask Copilot to show a portfolio dashboard with your tickers.
            </Text>
          </div>
        )}

        {loading && !data && (
          <div className={classes.grid} style={{ padding: 0 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Dashboard content */}
        {data && (
          <>
            {/* KPI summary row */}
            <div className={classes.kpiRow}>
              <Card size="small" className={classes.kpiCard}>
                <Text className={classes.kpiLabel}>Gainers</Text>
                <Text className={`${classes.kpiValue} ${classes.up}`}>
                  <ArrowUpRegular /> {kpis.up}
                </Text>
              </Card>
              <Card size="small" className={classes.kpiCard}>
                <Text className={classes.kpiLabel}>Decliners</Text>
                <Text className={`${classes.kpiValue} ${classes.down}`}>
                  <ArrowDownRegular /> {kpis.down}
                </Text>
              </Card>
              {kpis.top && (
                <Card size="small" className={classes.kpiCard}>
                  <Text className={classes.kpiLabel}>Top Gainer</Text>
                  <Text className={`${classes.kpiValue} ${classes.up}`}>
                    {kpis.top.symbol}{" "}
                    <span style={{ fontSize: "0.75em" }}>
                      +{kpis.top.changePercent!.toFixed(2)}%
                    </span>
                  </Text>
                </Card>
              )}
              {kpis.bot && kpis.bot.changePercent! < 0 && (
                <Card size="small" className={classes.kpiCard}>
                  <Text className={classes.kpiLabel}>Largest Drop</Text>
                  <Text className={`${classes.kpiValue} ${classes.down}`}>
                    {kpis.bot.symbol}{" "}
                    <span style={{ fontSize: "0.75em" }}>
                      {kpis.bot.changePercent!.toFixed(2)}%
                    </span>
                  </Text>
                </Card>
              )}
            </div>

            {/* Sort controls + Ticker cards + detail panel */}
            <SortFilterBar
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={(k, d) => {
                setSortKey(k);
                setSortDir(d);
              }}
            />
            <div className={classes.body}>
              <div className={classes.grid}>
                {tickers.map((t) => (
                  <TickerCard
                    key={t.symbol}
                    ticker={t}
                    selected={t.symbol === selectedTicker}
                    onSelect={() => selectTicker(t.symbol)}
                  />
                ))}
              </div>
              <TickerDetailPanel
                ticker={selectedData}
                canRefresh={canRefresh}
                loading={loading}
                error={error}
                onRefresh={refresh}
                onDismiss={() => selectTicker(null)}
              />
            </div>
          </>
        )}
      </div>
    </FluentProvider>
  );
}