import { useEffect, useRef, useState } from "react";
import { Text, makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  value: {
    transitionProperty: "opacity, transform",
    transitionDuration: "350ms",
    transitionTimingFunction: "ease-out",
    display: "inline-block",
  },
});

interface Props {
  value: number | null;
  format: (v: number) => string;
  fallback?: string;
  className?: string;
}

/**
 * Displays a numeric value with a subtle fade+slide animation when the
 * value changes.  Falls back to a static string when value is null.
 */
export function AnimatedValue({
  value,
  format,
  fallback = "—",
  className,
}: Props) {
  const classes = useStyles();
  const prev = useRef(value);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (value !== prev.current) {
      setAnimating(true);
      prev.current = value;
      const timer = setTimeout(() => setAnimating(false), 360);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const display = value !== null ? format(value) : fallback;

  return (
    <Text
      className={`${classes.value} ${className ?? ""}`}
      style={{
        opacity: animating ? 0.4 : 1,
        transform: animating ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {display}
    </Text>
  );
}
