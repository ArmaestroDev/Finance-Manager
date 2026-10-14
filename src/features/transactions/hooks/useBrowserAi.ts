import { useEffect, useSyncExternalStore } from "react";

import {
  checkBrowserAi,
  downloadBrowserAi,
  getBrowserAiState,
  removeBrowserAi,
  subscribeBrowserAi,
} from "../utils/browserAi";

/**
 * Live state of the in-browser model. `enabled` runs the hardware check
 * (only once per page load) — leave it off until the user picks the option.
 */
export function useBrowserAi(enabled: boolean) {
  const state = useSyncExternalStore(subscribeBrowserAi, getBrowserAiState, getBrowserAiState);

  useEffect(() => {
    if (enabled) void checkBrowserAi();
  }, [enabled]);

  return {
    state,
    download: downloadBrowserAi,
    remove: removeBrowserAi,
    recheck: () => checkBrowserAi(true),
  };
}
