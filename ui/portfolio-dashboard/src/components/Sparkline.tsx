import { tokens } from "@fluentui/react-components";

interface Props {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}

/**
 * Tiny SVG sparkline chart.  Renders a smooth polyline of closing prices
 * with a subtle gradient fill beneath it.  Colour follows gain/loss.
 */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  positive = true,
}: Props) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY = 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padY + ((max - v) / range) * (height - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lineColor = positive
    ? tokens.colorPaletteGreenForeground1
    : tokens.colorPaletteRedForeground1;

  const gradientId = `spark-${positive ? "up" : "dn"}`;

  // Close the polygon for the fill area
  const fillPoints = [
    ...points,
    `${width},${height}`,
    `0,${height}`,
  ].join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
