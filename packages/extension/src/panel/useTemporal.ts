import { useSyncExternalStore } from 'react';
import { useStore } from './store.js';

/** Reactive view of zundo's undo/redo availability. */
export function useTemporalState(): { canUndo: boolean; canRedo: boolean } {
  const snapshot = useSyncExternalStore(
    (cb) => useStore.temporal.subscribe(cb),
    () => {
      const t = useStore.temporal.getState();
      return `${t.pastStates.length}|${t.futureStates.length}`;
    },
  );
  const [past, future] = snapshot.split('|').map(Number);
  return { canUndo: past > 0, canRedo: future > 0 };
}
