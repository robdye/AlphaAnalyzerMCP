import {
  Button,
  Card,
  CardHeader,
  Divider,
  Link,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  tokens,
} from "@fluentui/react-components";
import { ArrowSyncRegular, DismissRegular } from "@fluentui/react-icons";
import type { TickerData } from "../types";

const useStyles = makeStyles({
  root: {
    width: "360px",
    minWidth: "360px",
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "12px",
  },
  price: {
    fontSize: "1.75rem",
    fontWeight: tokens.fontWeightBold,
    fontVariantNumeric: "tabular-nums",
  },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  statLabel: {
    color: tokens.colorNeutralForeground3,
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  statValue: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: tokens.fontWeightSemibold,
  },
  newsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  newsItem: {
    lineHeight: "1.4",
  },
  actions: {
    marginTop: "auto",
    paddingTop: "12px",
  },
});

interface Props {
  ticker: TickerData | null;
  canRefresh: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDismiss: () => void;
}

export function TickerDetailPanel({
  ticker,
  canRefresh,
  loading,
  error,
  onRefresh,
  onDismiss,
}: Props) {
  const classes = useStyles();

  if (!ticker) return null;

  const chg = ticker.change;
  const pct = ticker.changePercent;
  const isUp = chg !== null && chg >= 0;
  const changeClass = chg === null ? undefined : isUp ? classes.up : classes.down;
  const sign = chg !== null && chg >= 0 ? "+" : "";
  const fmt = (v: number | null) => (v !== null ? v.toFixed(2) : "—");

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Text size={500} weight="bold">
          {ticker.symbol}
        </Text>
        <Button
          icon={<DismissRegular />}
          appearance="subtle"
          size="small"
          onClick={onDismiss}
          aria-label="Close details"
        />
      </div>

      <div className={classes.priceRow}>
        <Text className={classes.price}>
          {ticker.price !== null ? `$${ticker.price.toFixed(2)}` : "—"}
        </Text>
        <Text className={changeClass} size={400} weight="semibold">
          {chg !== null ? `${sign}${chg.toFixed(2)}` : ""}
          {pct !== null ? ` (${sign}${pct.toFixed(2)}%)` : ""}
        </Text>
      </div>

      <div className={classes.statsGrid}>
        <div>
          <Text className={classes.statLabel} block>Open</Text>
          <Text className={classes.statValue}>{fmt(ticker.open)}</Text>
        </div>
        <div>
          <Text className={classes.statLabel} block>Prev Close</Text>
          <Text className={classes.statValue}>{fmt(ticker.prevClose)}</Text>
        </div>
        <div>
          <Text className={classes.statLabel} block>High</Text>
          <Text className={classes.statValue}>{fmt(ticker.high)}</Text>
        </div>
        <div>
          <Text className={classes.statLabel} block>Low</Text>
          <Text className={classes.statValue}>{fmt(ticker.low)}</Text>
        </div>
      </div>

      <Divider />

      <Text size={400} weight="semibold">
        Latest Headlines
      </Text>
      <div className={classes.newsList}>
        {ticker.news.length > 0 ? (
          ticker.news.map((n, i) => (
            <Card key={i} size="small" appearance="subtle">
              <CardHeader
                header={
                  <Text className={classes.newsItem}>
                    {n.url ? (
                      <Link href={n.url} target="_blank" rel="noopener">
                        {n.headline}
                      </Link>
                    ) : (
                      n.headline
                    )}
                  </Text>
                }
              />
            </Card>
          ))
        ) : (
          <Text italic>No recent headlines.</Text>
        )}
      </div>

      <div className={classes.actions}>
        {error && (
          <MessageBar intent="warning" style={{ marginBottom: 8 }}>
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}
        <Button
          icon={loading ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
          appearance="primary"
          disabled={loading}
          onClick={onRefresh}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
        {!canRefresh && !error && (
          <Text
            size={200}
            style={{ display: "block", marginTop: 6, color: tokens.colorNeutralForeground3 }}
          >
            Rerun <code>show_portfolio_dashboard</code> in chat to refresh.
          </Text>
        )}
      </div>
    </div>
  );
}