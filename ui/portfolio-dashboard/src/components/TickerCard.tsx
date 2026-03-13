import {
  makeStyles,
  Card,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowCircleUpRegular,
  ArrowCircleDownRegular,
} from "@fluentui/react-icons";
import type { TickerData } from "../types";
import { Sparkline } from "./Sparkline";
import { AnimatedValue } from "./AnimatedValue";

const useStyles = makeStyles({
  card: {
    padding: "14px",
    cursor: "pointer",
    transitionProperty: "box-shadow, border-color",
    transitionDuration: "150ms",
    "&:hover": {
      boxShadow: tokens.shadow8,
    },
  },
  selected: {
    outlineColor: tokens.colorBrandStroke1,
    outlineStyle: "solid",
    outlineWidth: "2px",
    boxShadow: tokens.shadow8Brand,
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  symbol: {
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase400,
  },
  changeChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    padding: "2px 8px",
    borderRadius: tokens.borderRadiusMedium,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    fontVariantNumeric: "tabular-nums",
  },
  chipUp: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
    color: tokens.colorPaletteGreenForeground1,
  },
  chipDown: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    color: tokens.colorPaletteRedForeground1,
  },
  price: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightBold,
    fontVariantNumeric: "tabular-nums",
    marginBottom: "6px",
  },
  statsRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "8px",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
  },
  statLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase" as const,
    letterSpacing: "0.4px",
  },
  statVal: {
    fontSize: tokens.fontSizeBase200,
    fontVariantNumeric: "tabular-nums",
  },
  headline: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: "6px",
    marginTop: "4px",
  },
});

interface Props {
  ticker: TickerData;
  selected: boolean;
  onSelect: () => void;
}

export function TickerCard({ ticker, selected, onSelect }: Props) {
  const classes = useStyles();
  const pct = ticker.changePercent;
  const isUp = pct !== null && pct >= 0;
  const sign = pct !== null && pct >= 0 ? "+" : "";
  const fmt = (v: number | null) => (v !== null ? `$${v.toFixed(2)}` : "—");
  const topHeadline = ticker.news[0]?.headline;

  return (
    <Card
      size="small"
      className={`${classes.card} ${selected ? classes.selected : ""}`}
      onClick={onSelect}
    >
      <div className={classes.topRow}>
        <Text className={classes.symbol}>{ticker.symbol}</Text>
        {pct !== null && (
          <span className={`${classes.changeChip} ${isUp ? classes.chipUp : classes.chipDown}`}>
            {isUp ? <ArrowCircleUpRegular fontSize={14} /> : <ArrowCircleDownRegular fontSize={14} />}
            {sign}{pct.toFixed(2)}%
          </span>
        )}
      </div>

      <AnimatedValue
        value={ticker.price}
        format={(v) => `$${v.toFixed(2)}`}
        className={classes.price}
      />

      {ticker.sparkline && ticker.sparkline.length >= 2 && (
        <Sparkline
          data={ticker.sparkline}
          positive={isUp}
          width={240}
          height={36}
        />
      )}

      <div className={classes.statsRow}>
        <div className={classes.stat}>
          <Text className={classes.statLabel}>Open</Text>
          <Text className={classes.statVal}>{fmt(ticker.open)}</Text>
        </div>
        <div className={classes.stat}>
          <Text className={classes.statLabel}>High</Text>
          <Text className={classes.statVal}>{fmt(ticker.high)}</Text>
        </div>
        <div className={classes.stat}>
          <Text className={classes.statLabel}>Low</Text>
          <Text className={classes.statVal}>{fmt(ticker.low)}</Text>
        </div>
        <div className={classes.stat}>
          <Text className={classes.statLabel}>Prev</Text>
          <Text className={classes.statVal}>{fmt(ticker.prevClose)}</Text>
        </div>
      </div>

      {topHeadline && (
        <Text className={classes.headline} title={topHeadline}>
          📰 {topHeadline}
        </Text>
      )}
    </Card>
  );
}
