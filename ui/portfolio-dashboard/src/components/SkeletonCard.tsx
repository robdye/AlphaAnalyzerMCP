import {
  Card,
  makeStyles,
  SkeletonItem,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  card: {
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsRow: {
    display: "flex",
    gap: "12px",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
});

/** Shimmering placeholder card shown while data is loading. */
export function SkeletonCard() {
  const classes = useStyles();

  return (
    <Card size="small" className={classes.card}>
      <div className={classes.topRow}>
        <SkeletonItem shape="rectangle" size={20} style={{ width: 60 }} />
        <SkeletonItem shape="rectangle" size={20} style={{ width: 72 }} />
      </div>
      <SkeletonItem shape="rectangle" size={28} style={{ width: 100 }} />
      <SkeletonItem shape="rectangle" size={32} style={{ width: "100%" }} />
      <div className={classes.statsRow}>
        <div className={classes.stat}>
          <SkeletonItem shape="rectangle" size={12} style={{ width: 30 }} />
          <SkeletonItem shape="rectangle" size={16} style={{ width: 50 }} />
        </div>
        <div className={classes.stat}>
          <SkeletonItem shape="rectangle" size={12} style={{ width: 30 }} />
          <SkeletonItem shape="rectangle" size={16} style={{ width: 50 }} />
        </div>
        <div className={classes.stat}>
          <SkeletonItem shape="rectangle" size={12} style={{ width: 30 }} />
          <SkeletonItem shape="rectangle" size={16} style={{ width: 50 }} />
        </div>
        <div className={classes.stat}>
          <SkeletonItem shape="rectangle" size={12} style={{ width: 30 }} />
          <SkeletonItem shape="rectangle" size={16} style={{ width: 50 }} />
        </div>
      </div>
      <SkeletonItem shape="rectangle" size={16} style={{ width: "90%" }} />
    </Card>
  );
}
