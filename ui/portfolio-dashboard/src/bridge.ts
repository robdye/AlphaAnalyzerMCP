/**
 * bridge.ts — backwards-compatible re-export layer.
 *
 * All host interaction logic now lives in hostBridge.ts.  This file
 * re-exports the old public names so that any remaining imports from
 * "./bridge" continue to compile without changes.
 */

export {
  capabilities,
  callTool,
  getToolInput as readToolInputs,
  getToolResult as readToolOutput,
  readBootstrapData,
  HostUnavailableError,
} from "./hostBridge";

// Legacy helpers that components used to import by name.
export { capabilities as canCallTool } from "./hostBridge";