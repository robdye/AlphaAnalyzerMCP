import {
  makeStyles,
  Select,
  Text,
  tokens,
} from "@fluentui/react-components";
import type { TickerData } from "../types";

export type SortKey = "symbol" | "price" | "changePercent";
export type SortDir = "asc" | "desc";

const useStyles = makeStyles({
  bar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  label: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
});

interface Props {
  sortKey: SortKey;
  sortDir: SortDir;
  onSortChange: (key: SortKey, dir: SortDir) => void;
}

export function SortFilterBar({ sortKey, sortDir, onSortChange }: Props) {
  const classes = useStyles();

  return (
    <div className={classes.bar}>
      <Text className={classes.label}>Sort by</Text>
      <Select
        size="small"
        value={`${sortKey}-${sortDir}`}
        onChange={(_e, data) => {
          const [k, d] = data.value.split("-") as [SortKey, SortDir];
          onSortChange(k, d);
        }}
      >
        <option value="symbol-asc">Symbol A → Z</option>
        <option value="symbol-desc">Symbol Z → A</option>
        <option value="changePercent-desc">Change % ↑ (best first)</option>
        <option value="changePercent-asc">Change % ↓ (worst first)</option>
        <option value="price-desc">Price ↑ (highest)</option>
        <option value="price-asc">Price ↓ (lowest)</option>
      </Select>
    </div>
  );
}

/** Sort a ticker array (returns a new array). */
export function sortTickers(
  tickers: TickerData[],
  key: SortKey,
  dir: SortDir,
): TickerData[] {
  const sorted = [...tickers];
  const mult = dir === "asc" ? 1 : -1;
  sorted.sort((a, b) => {
    if (key === "symbol") return mult * a.symbol.localeCompare(b.symbol);
    const av = a[key] ?? -Infinity;
    const bv = b[key] ?? -Infinity;
    return mult * (av - bv);
  });
  return sorted;
}
