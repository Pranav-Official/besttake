import { useState, useCallback, useRef } from "react";

export function useHistory<T>(initialState: T, capacity: number = 20) {
  const [state, setState] = useState<T>(initialState);
  const history = useRef<T[]>([initialState]);
  const pointer = useRef<number>(0);

  const set = useCallback(
    (nextState: T | ((prev: T) => T)) => {
      setState((prev) => {
        const resolvedNextState =
          typeof nextState === "function"
            ? (nextState as (prev: T) => T)(prev)
            : nextState;

        // Specialized comparison for Set
        const isEqual = (a: unknown, b: unknown) => {
          if (a instanceof Set && b instanceof Set) {
            if (a.size !== b.size) return false;
            const aValues = Array.from(a.values());
            for (const item of aValues) if (!b.has(item)) return false;
            return true;
          }
          return JSON.stringify(a) === JSON.stringify(b);
        };

        if (isEqual(resolvedNextState, prev)) {
          return prev;
        }

        // Cut off any "redo" history
        const newHistory = history.current.slice(0, pointer.current + 1);
        newHistory.push(resolvedNextState);

        // Enforce capacity
        if (newHistory.length > capacity) {
          newHistory.shift();
        } else {
          pointer.current++;
        }

        history.current = newHistory;
        return resolvedNextState;
      });
    },
    [capacity],
  );

  const undo = useCallback(() => {
    if (pointer.current > 0) {
      pointer.current--;
      const prevState = history.current[pointer.current];
      setState(prevState);
      return prevState;
    }
    return null;
  }, []);

  const redo = useCallback(() => {
    if (pointer.current < history.current.length - 1) {
      pointer.current++;
      const nextState = history.current[pointer.current];
      setState(nextState);
      return nextState;
    }
    return null;
  }, []);

  const canUndo = pointer.current > 0;
  const canRedo = pointer.current < history.current.length - 1;

  return { state, set, undo, redo, canUndo, canRedo };
}
