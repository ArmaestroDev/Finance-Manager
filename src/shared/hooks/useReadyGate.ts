import { useRef } from "react";

export interface ReadyGate {
  /** Resolves once the provider's initial AsyncStorage load has finished. */
  wait: () => Promise<void>;
  /** Mark the initial load as finished (idempotent). */
  open: () => void;
}

// Guards persisted providers against the load-before-save race: a mutation
// that runs before the initial AsyncStorage read finishes would persist
// "empty state + change", wiping the stored data, and the late-arriving load
// would then clobber the in-memory change. Mutations `await gate.wait()`
// first; the loader calls `gate.open()` in its `finally`.
export function useReadyGate(): ReadyGate {
  const ref = useRef<ReadyGate | null>(null);
  if (!ref.current) {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    ref.current = { wait: () => promise, open: () => resolve() };
  }
  return ref.current;
}
