import {
  makeStyles,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  tokens,
} from "@fluentui/react-components";
import type { TickerData } from "../types";

const useStyles = makeStyles({
  clickable: {
    cursor: "pointer",
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  symbol: { fontWeight: tokens.fontWeightSemibold },
  price: { fontVariantNumeric: "tabular-nums", fontWeight: tokens.fontWeightSemibold },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
  headline: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "300px",
    display: "block",
  },
  empty: {
    textAlign: "center",
    padding: "32px",
    color: tokens.colorNeutralForeground3,
  },
});

interface Props {
  data: TickerData[];
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
}

export function TickerTable({ data, selectedSymbol, onSelect }: Props) {
  const classes = useStyles();

  if (data.length === 0) {
    return (
      <div className={classes.empty}>
        <Text italic>No ticker data available.</Text>
      </div>
    );
  }

  return (
    <Table aria-label="Portfolio tickers" size="medium">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Ticker</TableHeaderCell>
          <TableHeaderCell>Price</TableHeaderCell>
          <TableHeaderCell>Change %</TableHeaderCell>
          <TableHeaderCell>Top Headline</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((t) => {
          const pct = t.changePercent;
          const isUp = pct !== null && pct >= 0;
          const changeClass = pct === null ? undefined : isUp ? classes.up : classes.down;
          const sign = pct !== null && pct >= 0 ? "+" : "";
          const topHeadline = t.news[0]?.headline ?? "—";
          const isSelected = t.symbol === selectedSymbol;

          return (
            <TableRow
              key={t.symbol}
              className={classes.clickable}
              onClick={() => onSelect(t.symbol)}
              aria-selected={isSelected}
              appearance={isSelected ? "brand" : "none"}
            >
              <TableCell>
                <Text className={classes.symbol}>{t.symbol}</Text>
              </TableCell>
              <TableCell>
                <Text className={classes.price}>
                  {t.price !== null ? `$${t.price.toFixed(2)}` : "—"}
                </Text>
              </TableCell>
              <TableCell>
                <Text className={changeClass}>
                  {pct !== null ? `${sign}${pct.toFixed(2)}%` : "—"}
                </Text>
              </TableCell>
              <TableCell>
                <Text className={classes.headline}>{topHeadline}</Text>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}