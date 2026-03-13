import {
  makeStyles,
  Text,
  Badge,
  tokens,
} from "@fluentui/react-components";
import { capabilities } from "../hostBridge";

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "12px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    marginBottom: "16px",
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
});

export function DashboardHeader() {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <div className={classes.titleGroup}>
        <Text as="h1" size={600} weight="semibold">
          Alpha Analyser Portfolio Dashboard
        </Text>
      </div>
      <Badge
        appearance="filled"
        color={capabilities.connected ? "success" : "informative"}
        size="medium"
      >
        {capabilities.connected ? "SDK Connected" : "Standalone"}
      </Badge>
    </div>
  );
}